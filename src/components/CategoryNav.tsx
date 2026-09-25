import React from 'react';
import { useValueList } from '../context/ValueListContext';
import { ItemCategory } from '../types';
import { Plane, Shield, Anchor, Crosshair, Radio, Zap, LayoutGrid, Tag } from 'lucide-react';
import { motion } from 'motion/react';

interface CategoryItem {
  id: ItemCategory | 'All';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'All', label: 'All Items', icon: LayoutGrid },
  { id: 'Air', label: 'Air', icon: Plane },
  { id: 'Land', label: 'Land', icon: Shield },
  { id: 'Naval', label: 'Naval', icon: Anchor },
  { id: 'Soldier', label: 'Soldier', icon: Crosshair },
  { id: 'Drone', label: 'Drone', icon: Radio },
  { id: 'Tags', label: 'Tags', icon: Tag },
  { id: 'Other', label: 'Other', icon: Zap },
];

export const CategoryNav: React.FC = () => {
  const { selectedCategory, setSelectedCategory, items, t, translateCategory } = useValueList();

  const getCategoryCount = (catId: ItemCategory | 'All') => {
    if (catId === 'All') return items.length;
    if (catId === 'Naval' || catId === 'Sea') {
      return items.filter(i => i.category === 'Naval' || i.category === 'Sea').length;
    }
    return items.filter(i => i.category === catId).length;
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          const count = getCategoryCount(cat.id);

          return (
            <motion.button
              key={cat.id}
              id={`cat-filter-${cat.id.toLowerCase()}`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedCategory(cat.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-colors shrink-0 select-none border backdrop-blur-md cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                  : 'bg-white/80 dark:bg-neutral-900/80 hover:bg-white dark:hover:bg-neutral-800 border-orange-100 dark:border-neutral-800 hover:border-orange-200 dark:hover:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white shadow-sm'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-orange-500/90 dark:text-orange-400'}`} />
              <span>{cat.id === 'All' ? t('allItems') : translateCategory(cat.id as ItemCategory)}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-500/20'
                }`}
              >
                {count}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
