// src/app/shopping/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, MapPin, Check, Plus, Loader2 } from 'lucide-react';
import { geminiClient } from '@/lib/agents/gemini-client';
import { ShoppingItem } from '@/types';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

const CATEGORIES = {
  'Supermarket': 'سوبر ماركت',
  'Market': 'سوق مركزي',
  'Vegetables': 'خضار وفواكه',
  'Meat': 'لحوم',
  'Spices': 'عطارة',
  'Cleaning': 'مواد تنظيف',
  'Other': 'أخرى'
};

export default function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [geoEnabled, setGeoEnabled] = useState(false);

  const addItem = async () => {
    if (!inputValue.trim()) return;

    // Optimistic add with "Other" category first
    const newItem: ShoppingItem = {
      id: uuidv4(),
      name: inputValue,
      category: 'Other',
      isBought: false
    };

    setItems(prev => [...prev, newItem]);
    setInputValue('');

    // Background process to categorize
    setIsProcessing(true);
    try {
      // In a real app, we would batch these or send the single item to be categorized
      // Simulating categorization for the single item by sending it in a list
      const response = await geminiClient.categorizeShoppingList([newItem.name]);
      if (response.success && response.data && response.data.length > 0) {
        const cat = response.data[0].category;
        setItems(prev => prev.map(item => item.id === newItem.id ? { ...item, category: cat } : item));
      }
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
  };

  const toggleBought = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, isBought: !i.isBought } : i));
  };

  const groupedItems = items.reduce((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <ShoppingCart className="h-8 w-8" />
            قائمتي الذكية
          </h1>
          <p className="text-slate-500">نظم مشترياتك وسأخبرك من أين تشتري كل غرض</p>
        </div>
        <Button
          variant={geoEnabled ? "default" : "outline"}
          onClick={() => setGeoEnabled(!geoEnabled)}
          className="gap-2"
        >
          <MapPin className="h-4 w-4" />
          {geoEnabled ? 'تنبيه الموقع مفعل' : 'تفعيل تنبيه الموقع'}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="أضف غرضاً للشراء (مثلاً: طماطم، صابون، لحم مفروم)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
            />
            <Button onClick={addItem} disabled={isProcessing}>
               {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <Card key={category} className="overflow-hidden">
             <CardHeader className="bg-slate-50 py-3 border-b">
               <CardTitle className="text-base flex justify-between items-center">
                 <span>{CATEGORIES[category as keyof typeof CATEGORIES] || category}</span>
                 <Badge variant="secondary">{categoryItems.length}</Badge>
               </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
               <ul className="divide-y divide-slate-100">
                 {categoryItems.map(item => (
                   <li
                     key={item.id}
                     className={cn(
                       "flex items-center p-3 hover:bg-slate-50 transition-colors cursor-pointer",
                       item.isBought && "bg-slate-50/50"
                     )}
                     onClick={() => toggleBought(item.id)}
                   >
                     <div className={cn(
                       "w-5 h-5 rounded-full border mr-3 flex items-center justify-center transition-colors",
                       item.isBought ? "bg-green-500 border-green-500 text-white" : "border-slate-300"
                     )}>
                       {item.isBought && <Check className="h-3 w-3" />}
                     </div>
                     <span className={cn("flex-1", item.isBought && "text-slate-400 line-through")}>
                       {item.name}
                     </span>
                   </li>
                 ))}
               </ul>
             </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
           <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed rounded-xl">
             <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
             <p>القائمة فارغة، ابدأ بإضافة المشتريات</p>
           </div>
        )}
      </div>
    </div>
  );
}
