import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserId, saveQuestionnaire } from '@/lib/store';
import { Button } from '@/components/ui/button';

const questions = [
  { id: 'q1', text: 'Coffee or tea?', options: ['Coffee', 'Tea'] },
  { id: 'q2', text: 'Weekend plans?', options: ['Outing', 'Netflix'] },
  { id: 'q3', text: 'Favorite activity?', options: ['Sports', 'Movies', 'Reading', 'Travel'] },
  { id: 'q4', text: 'Dogs or cats?', options: ['Dogs', 'Cats', 'Both'] },
];

export default function Questionnaire() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);

  const current = questions[step];
  const select = (val: string) => setAnswers(a => ({ ...a, [current.id]: val.toLowerCase() }));

  const next = async () => {
    if (step < questions.length - 1) return setStep(s => s + 1);
    const userId = getCurrentUserId();
    if (userId) await saveQuestionnaire(userId, answers);
    navigate('/photos');
  };

  return <div className="min-h-screen bg-background safe-top flex flex-col"><div className="max-w-sm mx-auto px-6 py-8 flex-1 flex flex-col"><h2 className="text-2xl font-heading font-bold mb-8">{current.text}</h2><div className="space-y-3 flex-1">{current.options.map(opt => <button key={opt} onClick={() => select(opt)} className={`w-full py-4 px-5 rounded-2xl text-left font-medium ${answers[current.id] === opt.toLowerCase() ? 'gradient-coral text-primary-foreground' : 'bg-card border border-border'}`}>{opt}</button>)}</div><Button onClick={next} disabled={!answers[current.id]} className="w-full mt-6 gradient-coral">{step < questions.length - 1 ? 'Next' : 'Finish'}</Button></div></div>;
}
