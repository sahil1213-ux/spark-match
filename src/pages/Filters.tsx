import { useState } from 'react';
import { getFilters, setFilters } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

export default function Filters() {
  const current = getFilters();
  const [ageRange, setAgeRange] = useState([current.ageMin, current.ageMax]);
  const [gender, setGender] = useState(current.gender);

  const genders: Array<'Male' | 'Female' | 'Any'> = ['Male', 'Female', 'Any'];

  const handleSave = () => {
    setFilters({ ageMin: ageRange[0], ageMax: ageRange[1], gender });
    toast.success('Filters saved!');
  };

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-6 pt-6">
        <h1 className="text-xl font-heading font-bold mb-6">Filters</h1>

        <div className="space-y-8">
          {/* Age */}
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

          {/* Gender */}
          <div>
            <label className="text-sm font-medium mb-3 block">Show me</label>
            <div className="flex gap-2">
              {genders.map(g => (
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
        </div>

        <Button
          onClick={handleSave}
          className="w-full h-12 rounded-xl gradient-coral text-primary-foreground font-semibold text-base border-0 mt-10"
        >
          Apply Filters
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
