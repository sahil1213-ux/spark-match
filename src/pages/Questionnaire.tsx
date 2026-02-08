import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, setCurrentUser } from '@/lib/store';
import { Button } from '@/components/ui/button';

const questions = [
  { id: 'q1', text: 'Coffee or tea?', options: ['Coffee', 'Tea'] },
  { id: 'q2', text: 'Weekend plans?', options: ['Outing', 'Netflix'] },
  { id: 'q3', text: 'Favorite activity?', options: ['Sports', 'Movies', 'Reading', 'Travel'] },
  { id: 'q4', text: 'Dogs or cats?', options: ['Dogs', 'Cats', 'Both'] },
  { id: 'q5', text: 'Morning or night?', options: ['Morning', 'Night'] },
  { id: 'q6', text: 'Cooking style?', options: ['Home chef', 'Takeout fan', 'Foodie explorer'] },
];

export default function Questionnaire() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);

  const current = questions[step];
  const progress = ((step + 1) / questions.length) * 100;

  const select = (val: string) => {
    setAnswers(a => ({ ...a, [current.id]: val.toLowerCase() }));
  };

  const next = () => {
    if (step < questions.length - 1) {
      setStep(s => s + 1);
    } else {
      const user = getCurrentUser();
      if (user) {
        setCurrentUser({ ...user, questionnaire: answers });
      }
      navigate('/photos');
    }
  };

  return (
    <div className="min-h-screen bg-background safe-top flex flex-col">
      <div className="max-w-sm mx-auto px-6 py-8 flex-1 flex flex-col">
        {/* Progress */}
        <div className="w-full h-1.5 bg-secondary rounded-full mb-8">
          <div
            className="h-full gradient-coral rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground mb-2 font-medium">
          {step + 1} of {questions.length}
        </p>
        <h2 className="text-2xl font-heading font-bold text-foreground mb-8">
          {current.text}
        </h2>

        <div className="space-y-3 flex-1">
          {current.options.map(opt => (
            <button
              key={opt}
              onClick={() => select(opt)}
              className={`w-full py-4 px-5 rounded-2xl text-left font-medium transition-all ${
                answers[current.id] === opt.toLowerCase()
                  ? 'gradient-coral text-primary-foreground shadow-lg scale-[1.02]'
                  : 'bg-card border border-border text-foreground hover:border-primary/30'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <Button
          onClick={next}
          disabled={!answers[current.id]}
          className="w-full h-12 rounded-xl gradient-coral text-primary-foreground font-semibold text-base border-0 mt-6 disabled:opacity-40"
        >
          {step < questions.length - 1 ? 'Next' : 'Finish'}
        </Button>
      </div>
    </div>
  );
}
