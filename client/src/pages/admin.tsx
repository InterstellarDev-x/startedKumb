import { useState } from 'preact/hooks'
import type { Question } from '../app'

type AdminProps = {
	questions: Question[]
	onCreateQuestion: (text: string, options: string[]) => void
	isConnected: boolean
}

const Admin = ({ questions, onCreateQuestion, isConnected }: AdminProps) => {
	const [question, setQuestion] = useState('')
	const [options, setOptions] = useState(['', ''])

	const updateOption = (index: number, value: string) => {
		setOptions((current) => current.map((opt, i) => (i === index ? value : opt)))
	}

	const addOption = () => {
		setOptions((current) => [...current, ''])
	}

	const submit = (event: Event) => {
		event.preventDefault()
		const cleanQuestion = question.trim()
		const cleanOptions = options.map((opt) => opt.trim()).filter(Boolean)

		if (!cleanQuestion || cleanOptions.length < 2) return

		onCreateQuestion(cleanQuestion, cleanOptions)
		setQuestion('')
		setOptions(['', ''])
	}

	return (
		<section className="page-grid admin-layout">
			<article className="hero-card admin-hero">
				<p className="eyebrow">E-Cell NIT Agartala</p>
				<h2>Admin Control Room</h2>
				<p>Create a poll in seconds and publish it directly to the audience voting booth.</p>
			</article>

			<article className="panel-card admin-editor-card">
				<h3>Create New Question</h3>
				<form className="admin-form" onSubmit={submit}>
					<label>
						Question
						<input
							placeholder="What should we focus on next quarter?"
							required
							value={question}
							onInput={(e) => setQuestion((e.target as HTMLInputElement).value)}
						/>
					</label>

					<div className="options-block">
						<p>Options</p>
						{options.map((option, index) => (
							<input
								key={`${index}-${option}`}
								placeholder={`Option ${index + 1}`}
								required={index < 2}
								value={option}
								onInput={(e) => updateOption(index, (e.target as HTMLInputElement).value)}
							/>
						))}
					</div>

					<div className="form-actions">
						<button className="ghost" onClick={addOption} type="button">
							+ Add option
						</button>
						<button className="publish-btn" disabled={!isConnected} type="submit">
							Publish Poll
						</button>
					</div>
				</form>
			</article>

			<article className="panel-card">
				<div className="card-head">
					<h3>Recent Questions</h3>
					<span className="mini-pill open">{questions.length}</span>
				</div>
				{questions.length === 0 && <p className="muted">No polls created yet in this session.</p>}
				<ul className="question-list">
					{questions.slice(0, 6).map((item) => (
						<li key={item.id}>{item.text}</li>
					))}
				</ul>
			</article>
		</section>
	)
}

export default Admin
