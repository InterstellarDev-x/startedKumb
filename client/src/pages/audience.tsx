import type { Question } from '../app'

type AudienceProps = {
  questions: Question[]
  votedQuestionIds: Set<string>
  onVote: (questionId: string, option: string) => void
}

const Audience = ({ questions, votedQuestionIds, onVote }: AudienceProps) => {
  const totalQuestions = questions.length
  const answeredQuestions = questions.filter((item) => votedQuestionIds.has(item.id)).length

  return (
    <section className="page-grid audience-layout">
      <article className="hero-card audience-hero">
        <p className="eyebrow">E-Cell NIT Agartala</p>
        <h2>Audience Voting Booth</h2>
        <p>
          Join directly and vote in one tap. Live results are pushed instantly to the event
          display board.
        </p>
        <div className="hero-stats" aria-label="Audience poll progress">
          <span>
            Active Polls <strong>{totalQuestions}</strong>
          </span>
          <span>
            Answered <strong>{answeredQuestions}</strong>
          </span>
        </div>
      </article>

      {questions.length === 0 && (
        <article className="panel-card empty-state">
          <h3>No active questions yet</h3>
          <p>Stay here. New polls from admin will appear automatically.</p>
        </article>
      )}

      {questions.map((question) => {
        const alreadyVoted = votedQuestionIds.has(question.id)
        const options = Object.keys(question.options)
        return (
          <article className="panel-card poll-card" key={question.id}>
            <div className="card-head">
              <h3>{question.text}</h3>
              <span className={`mini-pill ${alreadyVoted ? 'done' : 'open'}`}>
                {alreadyVoted ? 'Voted' : 'Open'}
              </span>
            </div>
            <div className="option-grid">
              {options.map((option) => (
                <button
                  className="option-btn"
                  disabled={alreadyVoted}
                  key={option}
                  onClick={() => onVote(question.id, option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          </article>
        )
      })}
    </section>
  )
}

export default Audience
