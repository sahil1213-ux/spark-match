import { useEffect, useState } from 'react';
import { getFilters, getUserPriorityOrder, saveUserPriorityOrder, setFilters } from '@/lib/store';
import type { TraitKey } from '@/lib/scoring';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

function titleCase(trait: string) {
  return trait.charAt(0).toUpperCase() + trait.slice(1);
}

export default function Filters() {
  const current = getFilters();
  const [ageRange, setAgeRange] = useState([current.ageMin, current.ageMax]);
  const [gender, setGender] = useState(current.gender);
  const [priorityOrder, setPriorityOrder] = useState<TraitKey[]>([]);
  const [draggedTrait, setDraggedTrait] = useState<TraitKey | null>(null);
  const [saving, setSaving] = useState(false);

  const genders: Array<'Male' | 'Female' | 'Any'> = ['Male', 'Female', 'Any'];

  useEffect(() => {
    const loadPriority = async () => {
      try {
        const order = await getUserPriorityOrder();
        setPriorityOrder(order);
      } catch (error) {
        console.error('Unable to load priority order', error);
      }
    };

    void loadPriority();
  }, []);

  const handleDrop = (targetTrait: TraitKey) => {
    if (!draggedTrait || draggedTrait === targetTrait) return;

    setPriorityOrder((prev) => {
      const withoutDragged = prev.filter((trait) => trait !== draggedTrait);
      const targetIndex = withoutDragged.indexOf(targetTrait);
      withoutDragged.splice(targetIndex, 0, draggedTrait);
      return withoutDragged;
    });

    setDraggedTrait(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      setFilters({ ageMin: ageRange[0], ageMax: ageRange[1], gender });
      if (priorityOrder.length > 0) {
        await saveUserPriorityOrder(priorityOrder);
      }
      toast.success('Filters and priority saved!');
    } catch (error) {
      console.error('Failed to save filters', error);
      toast.error('Could not save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-6 pt-6">
        <h1 className="text-xl font-heading font-bold mb-6">Filters</h1>

        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium">Age range</label>
              <span className="text-sm text-muted-foreground">{ageRange[0]} – {ageRange[1]}</span>
            </div>
            <Slider
              value={ageRange}
              onValueChange={setAgeRange}
              min={18}
              max={65}
              step={1}
              minStepsBetweenThumbs={1}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-3 block">Show me</label>
            <div className="flex gap-2">
              {genders.map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                    gender === g ? 'gradient-coral text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-3 block">Priority list (drag to reorder)</label>
            <div className="space-y-2">
              {priorityOrder.map((trait, index) => (
                <div
                  key={trait}
                  draggable
                  onDragStart={() => setDraggedTrait(trait)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(trait)}
                  className="rounded-xl border bg-card px-3 py-2 flex items-center justify-between"
                >
                  <span className="text-sm font-medium">{index + 1}. {titleCase(trait)}</span>
                  <span className="text-xs text-muted-foreground">drag</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Button
          onClick={() => void handleSave()}
          disabled={saving}
          className="w-full h-12 rounded-xl gradient-coral text-primary-foreground font-semibold text-base border-0 mt-10"
        >
          {saving ? 'Saving...' : 'Apply Filters'}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
