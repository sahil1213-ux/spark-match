import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserId, getCurrentUserProfile, saveQuestionnaire, UserProfile } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { TraitKey } from '@/lib/scoring';

type WeightedQuestion = {
  trait: TraitKey;
  text: string;
  weight: number;
  reverse?: boolean;
};

const questions: WeightedQuestion[] = [
  { trait: 'openness', text: 'I would enjoy traveling to places that are very different from my usual environment.', weight: 0.8 },
  { trait: 'openness', text: 'I like trying new things, even if I’m not sure I’ll enjoy them.', weight: 0.9 },
  { trait: 'openness', text: 'I enjoy learning about different cultures, lifestyles, or ways of thinking.', weight: 0.8 },
  { trait: 'openness', text: 'I enjoy creative activities like music, writing, photography, or art.', weight: 0.6 },

  { trait: 'conscientiousness', text: 'I usually plan things in advance instead of deciding at the last minute.', weight: 0.9 },
  { trait: 'conscientiousness', text: 'If I commit to something, I make sure I follow through.', weight: 1.0 },
  { trait: 'conscientiousness', text: 'I sometimes start things but don’t finish them.', weight: 0.8, reverse: true },
  { trait: 'conscientiousness', text: 'I like keeping my space clean and organized.', weight: 0.6 },

  { trait: 'extraversion', text: 'Spending time with people usually gives me energy.', weight: 1.0 },
  { trait: 'extraversion', text: 'I enjoy being the center of attention in a group.', weight: 0.7 },
  { trait: 'extraversion', text: 'I often prefer staying in by myself over going out or socializing.', weight: 0.8, reverse: true },
  { trait: 'extraversion', text: 'I find it easy to start conversations with new people.', weight: 0.9 },

  { trait: 'agreeableness', text: 'I try to understand how others feel before reacting.', weight: 1.0 },
  { trait: 'agreeableness', text: 'I usually try to avoid unnecessary arguments.', weight: 0.7 },
  { trait: 'agreeableness', text: 'I sometimes say things very directly, even if they might hurt someone.', weight: 0.6, reverse: true },
  { trait: 'agreeableness', text: 'I like helping people, even when I don’t get anything in return.', weight: 0.8 },

  { trait: 'neuroticism', text: 'I often feel anxious or worried, even about small things.', weight: 1.0 },
  { trait: 'neuroticism', text: 'I tend to feel stressed when things don’t go as planned.', weight: 0.9 },
  { trait: 'neuroticism', text: 'I’m usually able to stay calm during stressful situations.', weight: 0.8, reverse: true },
  { trait: 'neuroticism', text: 'My mood can change quickly depending on what’s happening.', weight: 0.7 },
];

const LIKERT = [1, 2, 3, 4, 5];
const PERSONALITY_PAGES = 4;
const TOTAL_STEPS = 5;

function computeWeightedScores(answers: Record<number, number>) {
  const traits: Record<TraitKey, { weighted: number; totalWeight: number }> = {
    openness: { weighted: 0, totalWeight: 0 },
    conscientiousness: { weighted: 0, totalWeight: 0 },
    extraversion: { weighted: 0, totalWeight: 0 },
    agreeableness: { weighted: 0, totalWeight: 0 },
    neuroticism: { weighted: 0, totalWeight: 0 },
  };

  questions.forEach((q, idx) => {
    const raw = answers[idx] ?? 3;
    const scaled = q.reverse ? 6 - raw : raw;
    traits[q.trait].weighted += scaled * q.weight;
    traits[q.trait].totalWeight += q.weight;
  });

  const normalized = {} as Record<TraitKey, number>;
  (Object.keys(traits) as TraitKey[]).forEach((trait) => {
    const { weighted, totalWeight } = traits[trait];
    const mean = totalWeight ? weighted / totalWeight : 3;
    normalized[trait] = Math.max(0, Math.min(100, Math.round(((mean - 1) / 4) * 100)));
  });

  return normalized;
}

function relationGoalFromLookingFor(lookingFor: UserProfile['lookingFor']) {
  if (lookingFor === 'Serious relationship') return 'long-term';
  if (lookingFor === 'Marriage') return 'long-term';
  if (lookingFor === 'Casual dating') return 'short-term';
  return 'open to anything';
}

export default function Questionnaire() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [bio, setBio] = useState('');
  const [height, setHeight] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState<'Single' | 'Divorced' | 'Prefer not to say'>('Single');
  const [lookingFor, setLookingFor] = useState<'Serious relationship' | 'Marriage' | 'Casual dating' | 'Not sure'>('Not sure');

  const setAnswer = (idx: number, val: number) => setAnswers((prev) => ({ ...prev, [idx]: val }));

  const liveScores = useMemo(() => computeWeightedScores(answers), [answers]);

  const priorityOrder = useMemo(() => {
    return (Object.entries(liveScores) as Array<[TraitKey, number]>)
      .sort((a, b) => b[1] - a[1])
      .map(([trait]) => trait);
  }, [liveScores]);

  const canNext = () => {
    if (step <= PERSONALITY_PAGES) {
      const start = (step - 1) * 5;
      const end = Math.min(start + 5, questions.length);
      return Array.from({ length: end - start }, (_, i) => start + i).every((index) => answers[index] !== undefined);
    }

    const words = bio.trim().split(/\s+/).filter(Boolean);
    return words.length <= 200 && bio.trim().length > 0;
  };

  const finish = async () => {
    const uid = getCurrentUserId();
    if (!uid) return;

    const profile = await getCurrentUserProfile();
    if (!profile) return;

    await saveQuestionnaire(uid, {
      bio,
      age: profile.age,
      gender: profile.gender,
      lat: profile.location?.latitude ?? 0,
      lon: profile.location?.longitude ?? 0,
      scores: liveScores,
      priorityOrder,
      minAge: 18,
      maxAge: 99,
      city: profile.city ?? '',
      relationshipGoal: relationGoalFromLookingFor(lookingFor),
      wantsChildren: 'unsure',
      hasChildren: 'no',
      smoking: 'prefer not to say',
      drinking: 'prefer not to say',
      exerciseFrequency: 'rarely',
      sleepHabits: 'flexible',
      eatingPreference: 'omnivore',
      occupation: profile.occupation ?? '',
      height,
      relationshipStatus,
      lookingFor,
    });

    navigate('/photos');
  };

  const next = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
    else void finish();
  };

  return (
    <div className="min-h-screen bg-background safe-top flex flex-col">
      <div className="max-w-sm mx-auto px-6 py-8 flex-1 flex flex-col">
        {step <= PERSONALITY_PAGES && (() => {
          const start = (step - 1) * 5;
          const end = Math.min(start + 5, questions.length);
          const page = questions.slice(start, end);
          return (
            <>
              <h2 className="text-2xl font-heading font-bold mb-1">Step 2: Personality Check ({step}/4)</h2>
              <p className="text-xs text-muted-foreground mb-6">Rate each statement from 1 (Not me) to 5 (Very me)</p>
              <div className="space-y-5 flex-1">
                {page.map((question, i) => {
                  const idx = start + i;
                  return (
                    <div key={idx}>
                      <p className="text-sm font-medium mb-2">{question.text}</p>
                      <div className="flex gap-2 flex-wrap">
                        {LIKERT.map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setAnswer(idx, value)}
                            className={`w-10 h-10 rounded-full text-sm font-bold ${answers[idx] === value ? 'gradient-coral text-primary-foreground' : 'bg-secondary'}`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}

        {step === 5 && (
          <>
            <h2 className="text-2xl font-heading font-bold mb-1">Step 3: Final Essentials</h2>
            <p className="text-xs text-muted-foreground mb-6">Photos are next (minimum 2, maximum 5)</p>
            <div className="space-y-4 flex-1">
              <div>
                <p className="text-sm font-medium mb-1">Short bio (max 200 words)</p>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-xl border bg-card p-3 min-h-28"
                  placeholder="Tell us something interesting about you..."
                />
                <p className="text-xs text-muted-foreground mt-1">{bio.trim().split(/\s+/).filter(Boolean).length}/200 words</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Height (optional)</p>
                <input className="w-full rounded-xl border bg-card p-3" value={height} onChange={(e) => setHeight(e.target.value)} placeholder={'e.g. 5\'9" / 175 cm'} />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Current relationship status</p>
                <div className="grid grid-cols-1 gap-2">
                  {(['Single', 'Divorced', 'Prefer not to say'] as const).map((status) => (
                    <button key={status} type="button" onClick={() => setRelationshipStatus(status)} className={`rounded-xl py-2.5 ${relationshipStatus === status ? 'gradient-coral text-primary-foreground' : 'bg-secondary'}`}>
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">What are you looking for?</p>
                <div className="grid grid-cols-1 gap-2">
                  {(['Serious relationship', 'Marriage', 'Casual dating', 'Not sure'] as const).map((option) => (
                    <button key={option} type="button" onClick={() => setLookingFor(option)} className={`rounded-xl py-2.5 ${lookingFor === option ? 'gradient-coral text-primary-foreground' : 'bg-secondary'}`}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        <Button onClick={next} disabled={!canNext()} className="w-full mt-6 gradient-coral">
          {step < TOTAL_STEPS ? 'Next' : 'Continue to Photos'}
        </Button>
      </div>
    </div>
  );
}
