import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertInspectionSchema } from "@shared/schema";
import type { Inspection, Building } from "@shared/schema";
import { z } from "zod";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Camera, Upload } from "lucide-react";
import { Link } from "wouter";
import type { UploadResult } from "@uppy/core";

const inspectionFormSchema = insertInspectionSchema.extend({
  photos: z.array(z.string()).optional(),
});

type InspectionFormData = z.infer<typeof inspectionFormSchema>;

export default function InspectionForm() {
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionFormSchema),
    defaultValues: {
      type: "regular",
      scheduledDate: new Date(),
      notes: "",
      photos: [],
    },
  });

  // Fetch buildings for the dropdown
  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  // Create inspection mutation
  const createInspectionMutation = useMutation({
    mutationFn: async (data: InspectionFormData) => {
      const inspectionData = {
        ...data,
        inspectorId: user?.id || "",
        photos: uploadedPhotos,
      };
      const response = await apiRequest("POST", "/api/inspections", inspectionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      toast({
        title: "성공",
        description: "점검이 성공적으로 생성되었습니다.",
      });
      form.reset();
      setUploadedPhotos([]);
    },
    onError: () => {
      toast({
        title: "오류",
        description: "점검 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Handle file upload
  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const photoURL = uploadedFile.uploadURL;
      
      try {
        // Set ACL policy for the uploaded photo
        await apiRequest("PUT", "/api/inspection-photos", {
          photoURL,
          inspectionId: "temp", // Will be updated when inspection is created
        });

        // Add to uploaded photos state
        setUploadedPhotos(prev => [...prev, photoURL || ""]);
        
        // Update form photos field
        const currentPhotos = form.getValues("photos") || [];
        form.setValue("photos", [...currentPhotos, photoURL || ""]);
        
        toast({
          title: "성공",
          description: "사진이 성공적으로 업로드되었습니다.",
        });
      } catch (error) {
        console.error("Error setting photo ACL:", error);
        toast({
          title: "오류",
          description: "사진 업로드 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    }
  };

  const onSubmit = (data: InspectionFormData) => {
    createInspectionMutation.mutate(data);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/inspections">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로가기
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">새 점검 등록</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>점검 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="buildingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>건물</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-building">
                            <SelectValue placeholder="건물을 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {buildings?.map((building) => (
                            <SelectItem key={building.id} value={building.id}>
                              {building.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>점검 유형</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="점검 유형을 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="regular">정기점검</SelectItem>
                          <SelectItem value="routine">정기점검</SelectItem>
                          <SelectItem value="emergency">긴급점검</SelectItem>
                          <SelectItem value="annual">연간점검</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>예정일</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          data-testid="input-scheduled-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>메모</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="점검에 대한 추가 메모를 입력하세요"
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createInspectionMutation.isPending}
                  data-testid="button-submit"
                >
                  {createInspectionMutation.isPending ? "생성 중..." : "점검 생성"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              점검 사진
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ObjectUploader
              maxNumberOfFiles={5}
              maxFileSize={10485760} // 10MB
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              buttonClassName="w-full"
            >
              <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                <Upload className="h-5 w-5" />
                <span>사진 업로드</span>
              </div>
            </ObjectUploader>

            {uploadedPhotos.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">업로드된 사진 ({uploadedPhotos.length})</h4>
                <div className="grid grid-cols-2 gap-2">
                  {uploadedPhotos.map((photo, index) => (
                    <div 
                      key={index} 
                      className="aspect-square bg-gray-100 rounded border flex items-center justify-center"
                      data-testid={`photo-${index}`}
                    >
                      <Camera className="h-8 w-8 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600">
              <p>• 최대 5개의 사진을 업로드할 수 있습니다</p>
              <p>• 파일 크기는 10MB 이하여야 합니다</p>
              <p>• JPG, PNG 형식을 지원합니다</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}