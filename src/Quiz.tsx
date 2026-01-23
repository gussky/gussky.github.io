import { Trophy, CheckCircle, XCircle } from 'lucide-react';

const GRADE_COLORS = {
  'A': '#038141',
  'B': '#85BB2F',
  'C': '#FECB02',
  'D': '#EE8100',
  'E': '#E63E11',
};

const QUIZ_PRODUCTS = [
  {id: 1, name: "High protein shake bananas & cream", category: "Beverages", correct: "B"},
  {id: 2, name: "Toasted multi-grain cereal with almonds & honey oat clusters", category: "Cereals", correct: "D"},
  {id: 3, name: "Frozen Fish Sticks", category: "Fish Meat Eggs", correct: "E"},
  {id: 4, name: "Organic Eggs", category: "Fish Meat Eggs", correct: "A"},
];

// Quiz Component
const Quiz = ({ 
  title, 
  description, 
  answers, 
  onAnswerChange, 
  isSubmitted, 
  showResults, 
  preAnswers
}: {
  title: string; 
  description: string; 
  answers: Record<number, string>; 
  onAnswerChange: (productId: number, grade: string) => void; 
  isSubmitted: boolean; 
  showResults?: boolean; 
  preAnswers?: Record<number, string>;
}) => {
  const calculateScore = (ans: Record<number, string>) => 
    QUIZ_PRODUCTS.reduce((acc, p) => acc + (ans[p.id] === p.correct ? 1 : 0), 0);
    
  const currentScore = calculateScore(answers);
  const preScore = preAnswers ? calculateScore(preAnswers) : null;
  const improvement = preScore !== null ? currentScore - preScore : null;
  
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: '#f8fafc',
      overflow: 'auto'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '800px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        padding: '32px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {isSubmitted && showResults ? (
            <div>
              <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#d97706', marginBottom: '12px' }}>
                <Trophy size={28} />
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>{title}</h1>
              {preScore !== null && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', margin: '24px 0' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>Before</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#475569' }}>{preScore}/{QUIZ_PRODUCTS.length}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}>After</div>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981' }}>{currentScore}/{QUIZ_PRODUCTS.length}</div>
                  </div>
                </div>
              )}
              {improvement !== null && (
                <p style={{ color: '#475569' }}>
                  {improvement > 0 
                    ? `🎉 You improved by ${improvement} point${improvement > 1 ? 's' : ''}!`
                    : improvement < 0
                    ? `Your score changed by ${improvement} points.`
                    : "Your score remained the same."}
                </p>
              )}
            </div>
          ) : (
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>{title}</h1>
              <p style={{ color: '#64748b' }}>{description}</p>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {QUIZ_PRODUCTS.map((product) => {
            const isCorrect = answers[product.id] === product.correct;
            const changed = preAnswers && preAnswers[product.id] !== answers[product.id];
                        
            return (
              <div 
                key={product.id}
                style={{
                  display: 'flex',
                  flexDirection: window.innerWidth < 640 ? 'column' : 'row',
                  alignItems: window.innerWidth < 640 ? 'flex-start' : 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '2px solid',
                  borderColor: isSubmitted && showResults
                    ? (isCorrect ? '#10b981' : '#ef4444')
                    : answers[product.id] 
                    ? '#3b82f6'
                    : '#e2e8f0',
                  backgroundColor: isSubmitted && showResults
                    ? (isCorrect ? '#f0fdf4' : '#fef2f2')
                    : answers[product.id]
                    ? '#eff6ff'
                    : '#f8fafc',
                  boxShadow: answers[product.id] && !isSubmitted
                    ? '0 2px 8px rgba(59, 130, 246, 0.15)'
                    : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {product.name}
                    {isSubmitted && showResults && (
                      isCorrect 
                        ? <CheckCircle size={18} style={{ color: '#10b981' }}/>
                        : <XCircle size={18} style={{ color: '#ef4444' }}/>
                    )}
                    {isSubmitted && showResults && changed && <span style={{ fontSize: '12px', color: '#3b82f6', backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '12px' }}>(Changed)</span>}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{product.category}</span>
                  {isSubmitted && showResults && preAnswers && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Before: <strong>{preAnswers[product.id] || 'N/A'}</strong> → After: <strong style={{ color: '#10b981' }}>{answers[product.id] || 'N/A'}</strong>
                    </div>
                  )}
                </div>
                                
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {Object.keys(GRADE_COLORS).map((grade) => {
                    const isSelected = answers[product.id] === grade;
                    const isRealCorrect = product.correct === grade;
                                    
                    let opacity = 0.6;
                    let scale = 1;
                    let border = 'none';
                                    
                    if (isSubmitted && showResults) {
                      if (isRealCorrect) {
                         opacity = 1;
                         border = '2px solid #10b981';
                       } else if (isSelected && !isRealCorrect) {
                         opacity = 1;
                         border = '2px solid #ef4444';
                       } else {
                         opacity = 0.3;
                       }
                    } else {
                      if (isSelected) {
                         opacity = 1;
                         scale = 1.15;
                         border = '3px solid #3b82f6';
                       }
                    }
                    return (
                      <button
                        key={grade}
                        onClick={() => !isSubmitted && onAnswerChange(product.id, grade)}
                        disabled={isSubmitted}
                        style={{ 
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          fontWeight: 'bold',
                          fontSize: '16px',
                          transition: 'all 0.2s ease',
                          transform: `scale(${scale})`,
                          opacity: opacity,
                          border: border,
                          backgroundColor: GRADE_COLORS[grade as keyof typeof GRADE_COLORS], 
                          color: 'white',
                          cursor: isSubmitted ? 'default' : 'pointer',
                          borderWidth: border !== 'none' ? (isSelected && !isSubmitted ? '3px' : '2px') : '0',
                          boxShadow: isSelected && !isSubmitted ? '0 4px 12px rgba(59, 130, 246, 0.4)' : 'none',
                          position: 'relative'
                        }}
                      >
                        {grade}
                        {isSelected && !isSubmitted && (
                          <span style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: '#3b82f6',
                            border: '2px solid white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }}>✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Quiz;
