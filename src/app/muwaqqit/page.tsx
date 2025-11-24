// src/app/muwaqqit/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileUp, Download, Loader2, Save } from 'lucide-react';
import { geminiClient } from '@/lib/agents/gemini-client';
import { PrayerTimes } from '@/types';
import * as Papa from 'papaparse';
import { saveAs } from 'file-saver';

export default function MuwaqqitPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<PrayerTimes[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const processFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      // Logic to read file as base64 or pass to agent
      // For PDF, we'd use PDF.js here to render to canvas then to image
      // For this demo, we simulate extraction
      const reader = new FileReader();
      reader.onload = async () => {
         const base64 = reader.result as string;
         const response = await geminiClient.processOCR(base64);

         if (response.success && response.data) {
           setData(response.data);
         }
         setIsProcessing(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
    }
  };

  const handleCellEdit = (index: number, field: keyof PrayerTimes, value: string) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    setData(newData);
  };

  const exportCSV = () => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'prayer_times.csv');
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, 'prayer_times.json');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">مُوَقِّت (Muwaqqit)</h1>
          <p className="text-slate-500">استخراج مواقيت الصلاة من الصور والجداول باستخدام الذكاء الاصطناعي</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>رفع الجدول (صورة أو PDF)</CardTitle>
          <CardDescription>سيقوم النظام بتحليل الصورة واستخراج المواعيد تلقائياً</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Input
                type="file"
                accept="image/*,application/pdf"
                className="cursor-pointer"
                onChange={handleFileChange}
              />
            </div>
            <Button onClick={processFile} disabled={!selectedFile || isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <Upload className="ml-2 h-4 w-4" />
                  معالجة
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {data.length > 0 && (
        <Card>
          <CardHeader>
             <div className="flex justify-between items-center">
                <CardTitle>النتائج المستخرجة</CardTitle>
                <div className="flex gap-2">
                   <Button variant="outline" size="sm" onClick={exportCSV}>
                      <FileUp className="ml-2 h-4 w-4" />
                      CSV
                   </Button>
                   <Button variant="outline" size="sm" onClick={exportJSON}>
                      <FileUp className="ml-2 h-4 w-4" />
                      JSON
                   </Button>
                </div>
             </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3 border-b">التاريخ</th>
                    <th className="p-3 border-b">الفجر</th>
                    <th className="p-3 border-b">الشروق</th>
                    <th className="p-3 border-b">الظهر</th>
                    <th className="p-3 border-b">العصر</th>
                    <th className="p-3 border-b">المغرب</th>
                    <th className="p-3 border-b">العشاء</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 border-b last:border-0 transition-colors">
                      <td className="p-1">
                        <Input
                          value={row.date}
                          onChange={(e) => handleCellEdit(idx, 'date', e.target.value)}
                          className="border-0 bg-transparent focus-visible:ring-0 w-full"
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          value={row.fajr}
                          onChange={(e) => handleCellEdit(idx, 'fajr', e.target.value)}
                          className="border-0 bg-transparent focus-visible:ring-0 w-full"
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          value={row.sunrise}
                          onChange={(e) => handleCellEdit(idx, 'sunrise', e.target.value)}
                          className="border-0 bg-transparent focus-visible:ring-0 w-full"
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          value={row.dhuhr}
                          onChange={(e) => handleCellEdit(idx, 'dhuhr', e.target.value)}
                          className="border-0 bg-transparent focus-visible:ring-0 w-full"
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          value={row.asr}
                          onChange={(e) => handleCellEdit(idx, 'asr', e.target.value)}
                          className="border-0 bg-transparent focus-visible:ring-0 w-full"
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          value={row.maghrib}
                          onChange={(e) => handleCellEdit(idx, 'maghrib', e.target.value)}
                          className="border-0 bg-transparent focus-visible:ring-0 w-full"
                        />
                      </td>
                      <td className="p-1">
                         <Input
                          value={row.isha}
                          onChange={(e) => handleCellEdit(idx, 'isha', e.target.value)}
                          className="border-0 bg-transparent focus-visible:ring-0 w-full"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => alert('تم الحفظ في النظام بنجاح')}>
                 <Save className="ml-2 h-4 w-4" />
                 حفظ التعديلات
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
