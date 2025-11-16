import type { Building, User, Inspection } from "@shared/schema";

export interface InspectorWorkload {
  inspectorId: string;
  inspector: User;
  currentInspections: Inspection[];
  weeklyHours: number;
  availableSlots: Date[];
  expertise: string[];
  location: string;
}

export interface SchedulingPreferences {
  preferredInspectorId?: string;
  requireCertification?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  allowWeekends: boolean;
  preferredTimeSlots: string[]; // e.g., ['morning', 'afternoon', 'evening']
  maxTravelDistance?: number;
}

export interface AutoAssignmentResult {
  recommendedInspector: User;
  suggestedDate: Date;
  confidence: number;
  reasons: string[];
  alternatives: Array<{
    inspector: User;
    date: Date;
    confidence: number;
    reasons: string[];
  }>;
}

export class AdvancedScheduler {
  private inspectors: User[] = [];
  private inspections: Inspection[] = [];
  private buildings: Building[] = [];

  constructor(inspectors: User[], inspections: Inspection[], buildings: Building[]) {
    this.inspectors = inspectors.filter(user => user.role === 'inspector');
    this.inspections = inspections;
    this.buildings = buildings;
  }

  /**
   * Automatically assign best inspector for a new inspection
   */
  async autoAssignInspector(
    buildingId: string,
    scheduledDate: Date,
    inspectionType: string,
    preferences: SchedulingPreferences = {
      urgency: 'medium',
      allowWeekends: false,
      preferredTimeSlots: ['morning', 'afternoon']
    }
  ): Promise<AutoAssignmentResult | null> {
    const building = this.buildings.find(b => b.id === buildingId);
    if (!building) {
      throw new Error('건물을 찾을 수 없습니다.');
    }

    const workloads = this.calculateInspectorWorkloads(scheduledDate, preferences);
    const scored = this.scoreInspectors(building, scheduledDate, inspectionType, workloads, preferences);

    if (scored.length === 0) {
      return null;
    }

    // Sort by confidence score (highest first)
    scored.sort((a, b) => b.confidence - a.confidence);

    const best = scored[0];
    const alternatives = scored.slice(1, 4); // Top 3 alternatives

    return {
      recommendedInspector: best.inspector,
      suggestedDate: best.suggestedDate || scheduledDate,
      confidence: best.confidence,
      reasons: best.reasons,
      alternatives: alternatives.map(alt => ({
        inspector: alt.inspector,
        date: alt.suggestedDate || scheduledDate,
        confidence: alt.confidence,
        reasons: alt.reasons
      }))
    };
  }

  /**
   * Calculate workload for each inspector
   */
  private calculateInspectorWorkloads(targetDate: Date, preferences?: SchedulingPreferences): InspectorWorkload[] {
    return this.inspectors.map(inspector => {
      // Get inspections for the target week
      const weekStart = new Date(targetDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weeklyInspections = this.inspections.filter(inspection => {
        const inspectionDate = new Date(inspection.scheduledDate);
        return inspection.inspectorId === inspector.id &&
               inspectionDate >= weekStart && 
               inspectionDate <= weekEnd &&
               inspection.status !== 'cancelled';
      });

      // Calculate weekly hours (assume 2 hours per inspection)
      const weeklyHours = weeklyInspections.length * 2;

      // Generate available time slots for the week with preferences
      const availableSlots = this.generateAvailableSlots(inspector.id, weekStart, weekEnd, preferences);

      return {
        inspectorId: inspector.id,
        inspector,
        currentInspections: weeklyInspections,
        weeklyHours,
        availableSlots,
        expertise: this.getInspectorExpertise(inspector),
        location: this.getInspectorLocation(inspector)
      };
    });
  }

  /**
   * Score inspectors based on multiple criteria
   */
  private scoreInspectors(
    building: Building,
    scheduledDate: Date,
    inspectionType: string,
    workloads: InspectorWorkload[],
    preferences: SchedulingPreferences
  ) {
    return workloads.map(workload => {
      let confidence = 0;
      const reasons: string[] = [];

      // Workload balancing (30% weight)
      const workloadScore = Math.max(0, 100 - (workload.weeklyHours * 2));
      confidence += workloadScore * 0.3;
      if (workload.weeklyHours < 20) {
        reasons.push('업무량이 적절합니다');
      } else if (workload.weeklyHours > 35) {
        reasons.push('업무량이 많아 일정이 빡빡할 수 있습니다');
      }

      // Availability (25% weight)
      const isAvailable = this.isInspectorAvailable(workload, scheduledDate);
      if (isAvailable) {
        confidence += 25;
        reasons.push('요청된 시간에 가능합니다');
      } else {
        const alternativeDate = this.findNearestAvailableSlot(workload, scheduledDate);
        if (alternativeDate) {
          confidence += 15;
          reasons.push(`${alternativeDate.toLocaleDateString('ko-KR')}에 가능합니다`);
        }
      }

      // Expertise matching (20% weight)
      const expertiseScore = this.calculateExpertiseMatch(workload.expertise, inspectionType);
      confidence += expertiseScore * 0.2;
      if (expertiseScore > 80) {
        reasons.push('전문 분야와 일치합니다');
      }

      // Geographic proximity (15% weight) with travel distance enforcement
      const distanceScore = this.calculateDistanceScore(workload.location, building.address);
      
      // Enforce maxTravelDistance if specified
      if (preferences.maxTravelDistance !== undefined) {
        const estimatedDistance = this.estimateDistance(workload.location, building.address);
        if (estimatedDistance > preferences.maxTravelDistance) {
          // Apply steep penalty for exceeding travel distance limit
          confidence -= 50;
          reasons.push(`이동 거리 초과 (${estimatedDistance}km > ${preferences.maxTravelDistance}km)`);
        } else {
          confidence += distanceScore * 0.15;
          reasons.push('이동 거리 조건 만족');
        }
      } else {
        confidence += distanceScore * 0.15;
        if (distanceScore > 80) {
          reasons.push('근거리에 위치합니다');
        }
      }

      // Certification requirements (10% weight)
      if (preferences.requireCertification) {
        const hasRequiredCert = workload.inspector.certificationNumber?.includes(preferences.requireCertification);
        if (hasRequiredCert) {
          confidence += 10;
          reasons.push('필수 자격증을 보유합니다');
        } else {
          confidence -= 20;
          reasons.push('필수 자격증이 부족합니다');
        }
      }

      // Preferred inspector bonus
      if (preferences.preferredInspectorId === workload.inspector.id) {
        confidence += 15;
        reasons.push('선호하는 점검원입니다');
      }

      return {
        inspector: workload.inspector,
        confidence: Math.max(0, Math.min(100, confidence)),
        reasons,
        suggestedDate: isAvailable ? scheduledDate : this.findNearestAvailableSlot(workload, scheduledDate)
      };
    }).filter(result => result.confidence > 20); // Filter out poor matches
  }

  /**
   * Check if inspector is available at given time
   */
  private isInspectorAvailable(workload: InspectorWorkload, date: Date): boolean {
    return workload.availableSlots.some(slot => 
      Math.abs(slot.getTime() - date.getTime()) < 60 * 60 * 1000 // Within 1 hour
    );
  }

  /**
   * Find nearest available time slot
   */
  private findNearestAvailableSlot(workload: InspectorWorkload, preferredDate: Date): Date | null {
    if (workload.availableSlots.length === 0) return null;

    return workload.availableSlots
      .sort((a, b) => Math.abs(a.getTime() - preferredDate.getTime()) - Math.abs(b.getTime() - preferredDate.getTime()))
      [0];
  }

  /**
   * Generate available time slots for inspector
   */
  private generateAvailableSlots(
    inspectorId: string, 
    weekStart: Date, 
    weekEnd: Date, 
    preferences?: SchedulingPreferences
  ): Date[] {
    const slots: Date[] = [];
    const current = new Date(weekStart);
    
    // Default preferences if not provided
    const allowWeekends = preferences?.allowWeekends ?? false;
    const preferredTimeSlots = preferences?.preferredTimeSlots ?? ['morning', 'afternoon', 'evening'];

    while (current <= weekEnd) {
      // Skip weekends based on preference
      if (!allowWeekends && (current.getDay() === 0 || current.getDay() === 6)) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      // Generate time slots based on preferences
      const timeSlots: { [key: string]: Date } = {};
      
      if (preferredTimeSlots.includes('morning')) {
        const morning = new Date(current);
        morning.setHours(9, 0, 0, 0);
        timeSlots.morning = morning;
      }
      
      if (preferredTimeSlots.includes('afternoon')) {
        const afternoon = new Date(current);
        afternoon.setHours(14, 0, 0, 0);
        timeSlots.afternoon = afternoon;
      }
      
      if (preferredTimeSlots.includes('evening')) {
        const evening = new Date(current);
        evening.setHours(17, 0, 0, 0);
        timeSlots.evening = evening;
      }

      // Check for conflicts with existing inspections
      const availableSlots = Object.values(timeSlots).filter(timeSlot => {
        const conflicts = this.inspections.filter(inspection => {
          const inspectionDate = new Date(inspection.scheduledDate);
          return inspection.inspectorId === inspectorId &&
                 inspection.status !== 'cancelled' &&
                 Math.abs(inspectionDate.getTime() - timeSlot.getTime()) < 2 * 60 * 60 * 1000; // Within 2 hours
        });
        return conflicts.length === 0;
      });

      slots.push(...availableSlots);
      current.setDate(current.getDate() + 1);
    }

    return slots;
  }

  /**
   * Calculate expertise match score
   */
  private calculateExpertiseMatch(expertise: string[], inspectionType: string): number {
    // Simplified expertise matching
    const typeMapping: Record<string, string[]> = {
      'routine': ['general', 'routine', 'basic'],
      'emergency': ['emergency', 'critical', 'urgent'],
      'maintenance': ['maintenance', 'technical', 'equipment'],
      'compliance': ['compliance', 'regulatory', 'audit']
    };

    const requiredExpertise = typeMapping[inspectionType] || ['general'];
    const matches = expertise.filter(exp => 
      requiredExpertise.some(req => exp.toLowerCase().includes(req.toLowerCase()))
    );

    return (matches.length / Math.max(requiredExpertise.length, 1)) * 100;
  }

  /**
   * Calculate distance-based score with region/district matching
   */
  private calculateDistanceScore(inspectorLocation: string, buildingAddress: string): number {
    // Extract regions/districts from addresses for better matching
    const inspectorRegion = this.extractRegionFromLocation(inspectorLocation);
    const buildingRegion = this.extractRegionFromLocation(buildingAddress);
    
    // Perfect match: same region/district
    if (inspectorRegion === buildingRegion && inspectorRegion !== 'unknown') {
      return 100;
    }
    
    // Good match: adjacent regions (simplified mapping)
    const adjacentRegions = this.getAdjacentRegions(inspectorRegion);
    if (adjacentRegions.includes(buildingRegion)) {
      return 80;
    }
    
    // Moderate match: same city/area
    const inspectorCity = this.extractCityFromLocation(inspectorLocation);
    const buildingCity = this.extractCityFromLocation(buildingAddress);
    if (inspectorCity === buildingCity && inspectorCity !== 'unknown') {
      return 60;
    }
    
    // Fallback to string similarity for partial matches
    const similarity = this.calculateStringSimilarity(
      inspectorLocation.toLowerCase(),
      buildingAddress.toLowerCase()
    );
    return Math.max(similarity * 40, 20); // Minimum 20% for any location
  }

  /**
   * Get inspector expertise based on certification and experience
   */
  private getInspectorExpertise(inspector: User): string[] {
    const expertise = ['general'];
    
    if (inspector.certificationNumber) {
      // Parse certification to determine expertise
      const cert = inspector.certificationNumber.toLowerCase();
      if (cert.includes('fire')) expertise.push('fire');
      if (cert.includes('safety')) expertise.push('safety');
      if (cert.includes('emergency')) expertise.push('emergency');
      if (cert.includes('technical')) expertise.push('technical');
    }

    return expertise;
  }

  /**
   * Get inspector location with realistic location mapping
   */
  private getInspectorLocation(inspector: User): string {
    // In production, this would come from user profile location field
    // For now, use email domain mapping to simulate realistic locations
    const domain = inspector.email.split('@')[1] || 'unknown';
    
    // Map common domains to Seoul districts for testing
    const locationMapping: Record<string, string> = {
      'gmail.com': '강남구, 서울시',
      'naver.com': '종로구, 서울시', 
      'daum.net': '마포구, 서울시',
      'kakao.com': '서초구, 서울시',
      'yahoo.com': '용산구, 서울시',
      'hotmail.com': '성동구, 서울시',
      'company.com': '중구, 서울시',
      'inspection.co.kr': '송파구, 서울시'
    };
    
    return locationMapping[domain] || '강서구, 서울시'; // Default Seoul location
  }

  /**
   * Calculate string similarity
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const matches = longer.split('').filter(char => shorter.includes(char)).length;
    return matches / longer.length;
  }

  /**
   * Extract region/district from location string
   */
  private extractRegionFromLocation(location: string): string {
    const regionPatterns = [
      /(강남구|종로구|마포구|서초구|용산구|성동구|중구|송파구|강서구|노원구|기오구|껠진구|도믔구|동안구|동대문구|서대문구|은평구|영등포구|양천구|구로구|금천구|강동구|성북구)/g,
      /(강남|종로|마포|서초|용산|성동|중|송파|강서|노원|기오|껠진|도믔|동안|동대문|서대문|은평|영등포|양천|구로|금천|강동|성북)/g
    ];
    
    for (const pattern of regionPatterns) {
      const match = location.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return 'unknown';
  }

  /**
   * Extract city from location string
   */
  private extractCityFromLocation(location: string): string {
    const cityPatterns = [
      /(서울시|부산시|대구시|인천시|광주시|대전시|울산시)/g,
      /(서울|부산|대구|인천|광주|대전|울산)/g
    ];
    
    for (const pattern of cityPatterns) {
      const match = location.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return 'unknown';
  }

  /**
   * Get adjacent regions for distance calculation
   */
  private getAdjacentRegions(region: string): string[] {
    const adjacencyMap: Record<string, string[]> = {
      '강남구': ['서초구', '용산구', '송파구', '성동구'],
      '종로구': ['중구', '성북구', '동대문구', '성동구'],
      '마포구': ['용산구', '영등포구', '강서구', '서대문구'],
      '서초구': ['강남구', '강서구', '동작구', '용산구'],
      '용산구': ['강남구', '서초구', '송파구', '마포구'],
      '성동구': ['강남구', '종로구', '송파구', '광진구'],
      '중구': ['종로구', '서대문구', '마포구'],
      '송파구': ['강남구', '성동구', '광진구', '용산구'],
      '강서구': ['서초구', '마포구', '양천구', '영등포구']
    };
    
    return adjacencyMap[region] || [];
  }

  /**
   * Estimate distance between two locations in kilometers  
   */
  private estimateDistance(location1: string, location2: string): number {
    const region1 = this.extractRegionFromLocation(location1);
    const region2 = this.extractRegionFromLocation(location2);
    
    // Same region/district: 0-5km
    if (region1 === region2 && region1 !== 'unknown') {
      return Math.random() * 5;
    }
    
    // Adjacent regions: 5-15km
    const adjacentRegions = this.getAdjacentRegions(region1);
    if (adjacentRegions.includes(region2)) {
      return 5 + Math.random() * 10;
    }
    
    const city1 = this.extractCityFromLocation(location1);
    const city2 = this.extractCityFromLocation(location2);
    
    // Same city, different regions: 10-25km
    if (city1 === city2 && city1 !== 'unknown') {
      return 10 + Math.random() * 15;
    }
    
    // Different cities: 20-50km
    return 20 + Math.random() * 30;
  }

  /**
   * Generate optimal schedule for multiple inspections with conflict-aware batching
   */
  async optimizeSchedule(
    inspectionRequests: Array<{
      buildingId: string;
      type: string;
      preferredDate?: Date;
      urgency: SchedulingPreferences['urgency'];
      preferences?: SchedulingPreferences;
    }>
  ): Promise<Array<{
    request: typeof inspectionRequests[0];
    assignment: AutoAssignmentResult | null;
    conflicts?: string[];
    workloadImpact?: number;
  }>> {
    // Enhanced sorting by urgency, preferred date, and geographic clustering
    const sorted = inspectionRequests.sort((a, b) => {
      const urgencyWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const urgencyDiff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
      
      if (urgencyDiff !== 0) return urgencyDiff;
      
      // Secondary sort by preferred date
      const dateA = a.preferredDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const dateB = b.preferredDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      return dateA.getTime() - dateB.getTime();
    });

    const results = [];
    const tempInspections = [...this.inspections]; // Track temporary assignments
    const workloadTracking = new Map<string, number>(); // Track inspector workload

    for (const request of sorted) {
      const preferredDate = request.preferredDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const preferences = request.preferences || {
        urgency: request.urgency,
        allowWeekends: false,
        preferredTimeSlots: ['morning', 'afternoon']
      };
      
      // Update scheduler with current temporary assignments
      this.inspections = tempInspections;
      
      const assignment = await this.autoAssignInspector(
        request.buildingId,
        preferredDate,
        request.type,
        preferences
      );

      // Detect potential conflicts and workload impact
      const conflicts: string[] = [];
      let workloadImpact = 0;
      
      if (assignment) {
        const inspectorId = assignment.recommendedInspector.id;
        const currentWorkload = workloadTracking.get(inspectorId) || 0;
        const newWorkload = currentWorkload + 2; // Assume 2 hours per inspection
        
        if (newWorkload > 40) {
          conflicts.push('점검원 업무량 초과 (40시간 이상)');
        }
        
        // Check for same-day conflicts
        const sameDay = tempInspections.filter(insp => {
          const inspDate = new Date(insp.scheduledDate);
          const assignDate = new Date(assignment.suggestedDate);
          return insp.inspectorId === inspectorId &&
                 inspDate.toDateString() === assignDate.toDateString() &&
                 insp.status !== 'cancelled';
        });
        
        if (sameDay.length >= 3) {
          conflicts.push('동일 일자에 너무 많은 점검 배정');
        }
        
        workloadImpact = (newWorkload / 40) * 100; // Percentage of full workload
        workloadTracking.set(inspectorId, newWorkload);
        
        // Add to temporary tracking
        tempInspections.push({
          id: `temp-${Date.now()}-${Math.random()}`,
          buildingId: request.buildingId,
          inspectorId: assignment.recommendedInspector.id,
          type: request.type as any,
          scheduledDate: assignment.suggestedDate,
          status: 'scheduled',
          notes: '',
          completedDate: null,
          createdAt: new Date(),
          reportUrl: null,
          signatureUrl: null
        });
      }

      results.push({ 
        request, 
        assignment, 
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        workloadImpact: workloadImpact > 0 ? workloadImpact : undefined
      });
    }

    // Restore original inspections
    this.inspections = this.inspections.filter(insp => !insp.id.startsWith('temp-'));

    return results;
  }
}

/**
 * Standalone utility function - Detect time conflicts between inspections
 */
export function detectTimeConflicts(inspections: Inspection[], minGapMinutes: number = 120): boolean {
  if (inspections.length <= 1) return false;
  
  const sortedInspections = inspections
    .filter(i => i.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  
  for (let i = 0; i < sortedInspections.length - 1; i++) {
    const current = new Date(sortedInspections[i].scheduledDate);
    const next = new Date(sortedInspections[i + 1].scheduledDate);
    
    // Check if gap between inspections is less than minimum required
    const gapMinutes = (next.getTime() - current.getTime()) / (1000 * 60);
    
    if (gapMinutes < minGapMinutes) {
      return true;
    }
  }
  
  return false;
}

/**
 * Standalone utility function - Estimate distance between locations
 */
export function estimateDistance(origin: string, destination: string): number {
  // Seoul district mapping for realistic distance estimates
  const districtCoordinates: Record<string, { lat: number, lng: number }> = {
    '강남구': { lat: 37.5172, lng: 127.0473 },
    '종로구': { lat: 37.5735, lng: 126.9788 },
    '마포구': { lat: 37.5665, lng: 126.9013 },
    '서초구': { lat: 37.4837, lng: 127.0324 },
    '용산구': { lat: 37.5384, lng: 126.9650 },
    '성동구': { lat: 37.5636, lng: 127.0367 },
    '중구': { lat: 37.5641, lng: 126.9979 },
    '송파구': { lat: 37.5145, lng: 127.1065 },
    '강서구': { lat: 37.5509, lng: 126.8495 },
    '강동구': { lat: 37.5301, lng: 127.1238 },
    '영등포구': { lat: 37.5263, lng: 126.8960 },
    '동작구': { lat: 37.5124, lng: 126.9393 },
    '관악구': { lat: 37.4781, lng: 126.9515 },
    '서대문구': { lat: 37.5794, lng: 126.9368 },
    '은평구': { lat: 37.6176, lng: 126.9227 },
    '노원구': { lat: 37.6544, lng: 127.0566 },
    '도봉구': { lat: 37.6658, lng: 127.0317 },
    '동대문구': { lat: 37.5838, lng: 127.0507 },
    '성북구': { lat: 37.6023, lng: 127.0178 },
    '강북구': { lat: 37.6396, lng: 127.0253 },
    '광진구': { lat: 37.5384, lng: 127.0822 },
    '중랑구': { lat: 37.6063, lng: 127.0925 },
    '금천구': { lat: 37.4569, lng: 126.8955 },
    '구로구': { lat: 37.4954, lng: 126.8874 },
    '양천구': { lat: 37.5169, lng: 126.8664 }
  };

  // Extract district from location strings
  const extractDistrict = (location: string): string => {
    const districtPattern = /(강남구|종로구|마포구|서초구|용산구|성동구|중구|송파구|강서구|강동구|영등포구|동작구|관악구|서대문구|은평구|노원구|도봉구|동대문구|성북구|강북구|광진구|중랑구|금천구|구로구|양천구)/g;
    const match = location.match(districtPattern);
    return match ? match[0] : 'unknown';
  };

  const originDistrict = extractDistrict(origin);
  const destDistrict = extractDistrict(destination);

  // If same district, return small distance
  if (originDistrict === destDistrict && originDistrict !== 'unknown') {
    return Math.random() * 3 + 1; // 1-4km within same district
  }

  // Get coordinates for distance calculation
  const originCoords = districtCoordinates[originDistrict];
  const destCoords = districtCoordinates[destDistrict];

  if (originCoords && destCoords) {
    // Simple distance calculation (Haversine formula simplified)
    const latDiff = Math.abs(originCoords.lat - destCoords.lat);
    const lngDiff = Math.abs(originCoords.lng - destCoords.lng);
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // Rough km conversion
    return Math.max(distance, 2); // Minimum 2km between different districts
  }

  // Default distance for unknown locations
  return Math.random() * 20 + 10; // 10-30km for unknown locations
}

/**
 * Extract region/district from location string
 */
export function extractRegionFromLocation(location: string): string {
  const regionPatterns = [
    /(강남구|종로구|마포구|서초구|용산구|성동구|중구|송파구|강서구|강동구|영등포구|동작구|관악구|서대문구|은평구|노원구|도봉구|동대문구|성북구|강북구|광진구|중랑구|금천구|구로구|양천구)/g,
    /(강남|종로|마포|서초|용산|성동|송파|강서|강동|영등포|동작|관악|서대문|은평|노원|도봉|동대문|성북|강북|광진|중랑|금천|구로|양천)/g
  ];
  
  for (const pattern of regionPatterns) {
    const match = location.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return 'unknown';
}

/**
 * Get adjacent regions for distance calculation
 */
export function getAdjacentRegions(region: string): string[] {
  const adjacencyMap: Record<string, string[]> = {
    '강남구': ['서초구', '용산구', '송파구', '강동구'],
    '종로구': ['중구', '성북구', '동대문구', '서대문구'],
    '마포구': ['용산구', '영등포구', '강서구', '서대문구'],
    '서초구': ['강남구', '강서구', '동작구', '관악구'],
    '용산구': ['강남구', '서초구', '마포구', '중구'],
    '성동구': ['광진구', '동대문구', '중랑구', '종로구'],
    '중구': ['종로구', '서대문구', '용산구', '동작구'],
    '송파구': ['강남구', '강동구', '광진구', '서초구'],
    '강서구': ['양천구', '영등포구', '마포구', '서초구'],
    '강동구': ['송파구', '광진구', '성동구', '강남구'],
    '영등포구': ['강서구', '양천구', '동작구', '마포구'],
    '동작구': ['서초구', '관악구', '영등포구', '중구'],
    '관악구': ['서초구', '동작구', '금천구', '구로구'],
    '서대문구': ['마포구', '종로구', '은평구', '중구'],
    '은평구': ['서대문구', '종로구', '성북구', '강북구'],
    '노원구': ['도봉구', '강북구', '성북구', '중랑구'],
    '도봉구': ['노원구', '강북구'],
    '동대문구': ['종로구', '성북구', '중랑구', '성동구'],
    '성북구': ['종로구', '동대문구', '강북구', '은평구'],
    '강북구': ['성북구', '도봉구', '노원구', '은평구'],
    '광진구': ['성동구', '동대문구', '중랑구', '송파구'],
    '중랑구': ['광진구', '동대문구', '성북구', '노원구'],
    '금천구': ['관악구', '구로구', '영등포구'],
    '구로구': ['금천구', '관악구', '양천구', '영등포구'],
    '양천구': ['구로구', '강서구', '영등포구']
  };
  
  return adjacencyMap[region] || [];
}

// Utility functions for schedule management
export const scheduleUtils = {
  /**
   * Get upcoming inspections for an inspector
   */
  getUpcomingInspections(inspectorId: string, inspections: Inspection[], days: number = 7): Inspection[] {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    return inspections.filter(inspection => {
      const scheduledDate = new Date(inspection.scheduledDate);
      return inspection.inspectorId === inspectorId &&
             inspection.status === 'scheduled' &&
             scheduledDate >= now &&
             scheduledDate <= future;
    }).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  },

  /**
   * Detect scheduling conflicts
   */
  detectConflicts(inspections: Inspection[]): Array<{
    conflictType: 'overlap' | 'overload' | 'distance';
    inspections: Inspection[];
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }> {
    const conflicts: Array<{
      conflictType: 'overlap' | 'overload' | 'distance';
      inspections: Inspection[];
      severity: 'low' | 'medium' | 'high';
      suggestion: string;
    }> = [];
    
    // Group by inspector
    const byInspector = inspections.reduce((acc, inspection) => {
      if (!acc[inspection.inspectorId]) acc[inspection.inspectorId] = [];
      acc[inspection.inspectorId].push(inspection);
      return acc;
    }, {} as Record<string, Inspection[]>);

    // Check for overlapping inspections
    Object.values(byInspector).forEach((inspectorInspections: Inspection[]) => {
      inspectorInspections.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
      
      for (let i = 0; i < inspectorInspections.length - 1; i++) {
        const current = inspectorInspections[i];
        const next = inspectorInspections[i + 1];
        
        const currentEnd = new Date(current.scheduledDate);
        currentEnd.setHours(currentEnd.getHours() + 2); // Assume 2 hours per inspection
        
        const nextStart = new Date(next.scheduledDate);
        
        if (currentEnd > nextStart) {
          conflicts.push({
            conflictType: 'overlap' as const,
            inspections: [current, next],
            severity: 'high' as const,
            suggestion: '점검 시간을 조정하거나 다른 점검원에게 할당하세요.'
          });
        }
      }
    });

    return conflicts;
  },

  /**
   * Calculate optimal time slots for a date range
   */
  calculateOptimalTimeSlots(
    startDate: Date,
    endDate: Date,
    existingInspections: Inspection[],
    inspectorId?: string
  ): Array<{
    date: Date;
    confidence: number;
    reason: string;
  }> {
    const slots: Array<{
      date: Date;
      confidence: number;
      reason: string;
    }> = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      // Skip weekends
      if (current.getDay() === 0 || current.getDay() === 6) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      // Morning slot (9 AM)
      const morning = new Date(current);
      morning.setHours(9, 0, 0, 0);
      
      // Afternoon slot (2 PM)
      const afternoon = new Date(current);
      afternoon.setHours(14, 0, 0, 0);

      [morning, afternoon].forEach(slot => {
        const conflicts = existingInspections.filter(inspection => {
          if (inspectorId && inspection.inspectorId !== inspectorId) return false;
          
          const inspectionDate = new Date(inspection.scheduledDate);
          const timeDiff = Math.abs(inspectionDate.getTime() - slot.getTime());
          return timeDiff < 2 * 60 * 60 * 1000; // Within 2 hours
        });

        if (conflicts.length === 0) {
          let confidence = 80;
          let reason = '가능한 시간입니다';

          // Boost confidence for morning slots
          if (slot.getHours() === 9) {
            confidence += 10;
            reason = '오전 시간대로 최적입니다';
          }

          // Reduce confidence for Friday afternoons
          if (slot.getDay() === 5 && slot.getHours() > 12) {
            confidence -= 15;
            reason = '주말 전 오후로 약간의 제약이 있습니다';
          }

          slots.push({ date: slot, confidence, reason });
        }
      });

      current.setDate(current.getDate() + 1);
    }

    return slots.sort((a, b) => b.confidence - a.confidence);
  },

  /**
   * Detect time conflicts between inspections on the same day
   */
  hasTimeConflicts(inspections: Inspection[]): boolean {
    if (inspections.length <= 1) return false;
    
    const sortedInspections = inspections
      .filter(i => i.status !== 'cancelled')
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    
    for (let i = 0; i < sortedInspections.length - 1; i++) {
      const current = new Date(sortedInspections[i].scheduledDate);
      const next = new Date(sortedInspections[i + 1].scheduledDate);
      
      // Assume each inspection takes 2 hours
      const currentEnd = new Date(current.getTime() + 2 * 60 * 60 * 1000);
      
      if (currentEnd > next) {
        return true;
      }
    }
    
    return false;
  }
};