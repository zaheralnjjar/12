// src/app/cooking/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChefHat, Flame, Clock, Plus, Trash2, Heart } from 'lucide-react';
import { geminiClient } from '@/lib/agents/gemini-client';
import { Recipe } from '@/types';
import { cn } from '@/lib/utils';

export default function CookingPage() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const addIngredient = () => {
    if (currentInput.trim()) {
      setIngredients([...ingredients, currentInput.trim()]);
      setCurrentInput('');
    }
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const getRecipes = async () => {
    if (ingredients.length === 0) return;
    setIsLoading(true);
    const response = await geminiClient.suggestRecipes(ingredients);
    if (response.success && response.data) {
      setRecipes(response.data);
    }
    setIsLoading(false);
  };

  const toggleFavorite = (id: string) => {
    const newFavs = new Set(favorites);
    if (newFavs.has(id)) {
      newFavs.delete(id);
    } else {
      newFavs.add(id);
    }
    setFavorites(newFavs);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <ChefHat className="h-8 w-8" />
          الطبخ الذكي
        </h1>
        <p className="text-slate-500">أدخل المكونات المتوفرة لديك وسأقترح عليك وصفات حلال 100%</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Ingredients Panel */}
        <div className="md:col-span-1 space-y-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>مكوناتي</CardTitle>
              <CardDescription>ماذا يوجد في ثلاجتك؟</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="أضف مكوناً (مثلاً: دجاج)"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                />
                <Button size="icon" onClick={addIngredient}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[100px] content-start">
                {ingredients.length === 0 && (
                  <p className="text-sm text-slate-400 w-full text-center py-4">لا توجد مكونات مضافة</p>
                )}
                {ingredients.map((ing, idx) => (
                  <span key={idx} className="bg-slate-100 text-slate-800 text-sm px-3 py-1 rounded-full flex items-center gap-2 group">
                    {ing}
                    <button onClick={() => removeIngredient(idx)} className="text-slate-400 hover:text-red-500">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={getRecipes} disabled={ingredients.length === 0 || isLoading}>
                {isLoading ? 'جاري البحث...' : 'اقترح وصفات'}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Recipes Grid */}
        <div className="md:col-span-2">
           {recipes.length === 0 && !isLoading ? (
             <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 text-slate-400">
                <ChefHat className="h-16 w-16 mb-4 opacity-20" />
                <p>أضف المكونات واضغط على زر الاقتراح لتظهر النتائج هنا</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {recipes.map((recipe) => (
                 <Card key={recipe.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                   <div className="h-40 bg-slate-200 w-full relative">
                      {/* Placeholder for Image */}
                      <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-100">
                         {recipe.name} Image
                      </div>
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-slate-700">
                        {recipe.tags[0]}
                      </div>
                   </div>
                   <CardHeader className="pb-2">
                     <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{recipe.name}</CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn("h-8 w-8", favorites.has(recipe.id) ? "text-red-500 hover:text-red-600" : "text-slate-300")}
                          onClick={() => toggleFavorite(recipe.id)}
                        >
                          <Heart className="h-5 w-5 fill-current" />
                        </Button>
                     </div>
                     <div className="flex gap-4 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {recipe.prepTime}</span>
                        <span className="flex items-center gap-1"><Flame className="h-3 w-3" /> {recipe.difficulty}</span>
                     </div>
                   </CardHeader>
                   <CardContent>
                      <h4 className="font-semibold text-sm mb-2">المكونات:</h4>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {recipe.ingredients.slice(0, 5).map((ing, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{ing}</span>
                        ))}
                        {recipe.ingredients.length > 5 && <span className="text-xs text-slate-400">...</span>}
                      </div>
                      <h4 className="font-semibold text-sm mb-1">طريقة التحضير:</h4>
                      <p className="text-xs text-slate-600 line-clamp-3">
                        {recipe.steps.join(' ')}
                      </p>
                   </CardContent>
                 </Card>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
