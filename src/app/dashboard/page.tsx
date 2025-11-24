// src/app/dashboard/page.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, CheckCircle2, Clock, Calendar as CalendarIcon, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/types';

// Mock Tasks
const MOCK_TASKS: Task[] = [
  { id: '1', title: 'قراءة ورد القرآن', category: 'Worship', priority: 'Urgent', isCompleted: false, date: '2023-10-24' },
  { id: '2', title: 'اجتماع فريق العمل', category: 'Work', priority: 'Important', isCompleted: false, date: '2023-10-24' },
  { id: '3', title: 'شراء الخضار', category: 'Home', priority: 'Optional', isCompleted: true, date: '2023-10-24' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <LayoutDashboard className="h-8 w-8" />
          يومي (My Day)
        </h1>
        <p className="text-slate-500">نظرة عامة على مهامك وأدائك اليوم</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
           <CardContent className="pt-6">
              <div className="text-2xl font-bold">5</div>
              <div className="text-blue-100 text-sm">مهام اليوم</div>
           </CardContent>
        </Card>
        <Card>
           <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">60%</div>
              <div className="text-slate-500 text-sm">نسبة الإنجاز</div>
           </CardContent>
        </Card>
        <Card>
           <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-500">2</div>
              <div className="text-slate-500 text-sm">مهام مستعجلة</div>
           </CardContent>
        </Card>
        <Card>
           <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-500">الظهر</div>
              <div className="text-slate-500 text-sm">الصلاة القادمة (12:00)</div>
           </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
           <Card className="h-full">
             <CardHeader>
               <CardTitle>قائمة المهام</CardTitle>
               <CardDescription>المهام المرتبة حسب الأولوية الذكية</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="space-y-2">
                 {MOCK_TASKS.map(task => (
                   <div key={task.id} className="flex items-center p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                      <div className={cn("w-5 h-5 rounded-full border mr-3 flex items-center justify-center", task.isCompleted ? "bg-green-500 border-green-500 text-white" : "border-slate-300")}>
                         {task.isCompleted && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      <div className="flex-1">
                         <div className={cn("font-medium", task.isCompleted && "line-through text-slate-400")}>{task.title}</div>
                         <div className="text-xs text-slate-500 flex gap-2 mt-1">
                            <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {task.category}</span>
                         </div>
                      </div>
                      <Badge variant={task.priority === 'Urgent' ? 'destructive' : task.priority === 'Important' ? 'default' : 'secondary'}>
                        {task.priority === 'Urgent' ? 'مستعجل' : task.priority === 'Important' ? 'مهم' : 'اختياري'}
                      </Badge>
                   </div>
                 ))}
                 <Button variant="ghost" className="w-full text-slate-500 hover:text-primary mt-2">
                    <ArrowUpRight className="h-4 w-4 ml-2" />
                    عرض كل المهام
                 </Button>
               </div>
             </CardContent>
           </Card>
        </div>

        <div>
           <Card className="h-full">
             <CardHeader>
               <CardTitle>تحليل الأداء</CardTitle>
             </CardHeader>
             <CardContent>
                <div className="space-y-4">
                   <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                         <span>العبادة</span>
                         <span className="font-bold">80%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-emerald-500 w-[80%]"></div>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                         <span>العمل</span>
                         <span className="font-bold">45%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 w-[45%]"></div>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                         <span>البيت</span>
                         <span className="font-bold">100%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-purple-500 w-[100%]"></div>
                      </div>
                   </div>

                   <div className="mt-6 p-3 bg-blue-50 rounded text-sm text-blue-800">
                      💡 <strong>اقتراح:</strong> حاول إنجاز مهام العمل المتبقية قبل الساعة 4 مساءً لتحصل على وقت راحة كافٍ.
                   </div>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
