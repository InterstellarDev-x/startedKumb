import type { Question } from '../app'
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'

type DisplayProps = {
	questions: Question[]
	users: number
	isConnected: boolean
}

const BAR_COLORS = ['#0a84ff', '#22b8cf', '#f59f00', '#12b886', '#f76707', '#e03131']

const Display = ({ questions, users, isConnected }: DisplayProps) => {
	const totalVotes = questions.reduce(
		(sum, question) =>
			sum + Object.values(question.options).reduce((acc, current) => acc + current, 0),
		0,
	)

	return (
		<section className="page-grid display-layout">
			<article className="hero-card display-hero">
				<p className="eyebrow">Display Board</p>
				<h2>Live Poll Snapshot</h2>
				<p>Project this view on the main screen to show current engagement and results.</p>
			</article>

			<article className="metrics-row">
				<div className="metric">
					<span>Audience online</span>
					<strong>{users}</strong>
				</div>
				<div className="metric">
					<span>Total votes</span>
					<strong>{totalVotes}</strong>
				</div>
				<div className="metric">
					<span>Socket status</span>
					<strong>{isConnected ? 'Live' : 'Offline'}</strong>
				</div>
			</article>

			{questions.length === 0 && (
				<article className="panel-card empty-state">
					<h3>Waiting for first poll</h3>
					<p>Once admin publishes a question, the chart will appear here.</p>
				</article>
			)}

			{questions.map((question) => {
				const chartData = Object.entries(question.options).map(([option, votes]) => ({
					option,
					votes,
				}))
				const total = chartData.reduce((sum, row) => sum + row.votes, 0)
				const chartHeight = Math.max(220, chartData.length * 58)
				return (
					<article className="panel-card" key={question.id}>
						<div className="chart-header">
							<h3>{question.text}</h3>
							<p>{total} total votes</p>
						</div>
						<div className="chart-wrap" style={{ height: `${chartHeight}px` }}>
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={chartData} layout="vertical" margin={{ left: 18, right: 18, top: 12, bottom: 8 }}>
									<CartesianGrid strokeDasharray="3 3" stroke="#dce4ec" horizontal={false} />
									<XAxis allowDecimals={false} type="number" tick={{ fill: '#486277', fontSize: 12 }} />
									<YAxis
										type="category"
										dataKey="option"
										width={120}
										tick={{ fill: '#10212f', fontSize: 12 }}
									/>
									<Tooltip
										cursor={{ fill: 'rgba(10, 132, 255, 0.08)' }}
										formatter={(value) => {
											const voteCount = typeof value === 'number' ? value : Number(value ?? 0)
											const pct = total > 0 ? Math.round((voteCount / total) * 100) : 0
											return [`${voteCount} votes (${pct}%)`, 'Result']
										}}
									/>
									<Bar dataKey="votes" radius={[0, 10, 10, 0]}>
										{chartData.map((entry, index) => (
											<Cell key={`${entry.option}-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</article>
				)
			})}
		</section>
	)
}

export default Display
