import type { ServerWebSocket } from "bun";

type Question = {
  id: string
  text: string
  options: Record<string, number>
  voters: Set<string>
}

type ClientData = {
  userId: string
  role: "audience" | "display" | "admin"
}

class PollingSystem {

  private audience = new Set<ServerWebSocket<ClientData>>()
  private displays = new Set<ServerWebSocket<ClientData>>()
  private admins = new Set<ServerWebSocket<ClientData>>()

  private questions: Question[] = []

  addAudience(ws: ServerWebSocket<ClientData>) {
    this.removeClient(ws)
    this.audience.add(ws)
    console.log("audience size" , this.audience.size)
    console.log("displays size" , this.displays.size)
    console.log("admins size" , this.admins.size)

    ws.send(JSON.stringify({
      type: "init",
      questions: this.serializeQuestions()
    }))
  }

  addDisplay(ws: ServerWebSocket<ClientData>) {
    this.removeClient(ws)
    this.displays.add(ws)
    console.log("audience size" , this.audience.size)
    console.log("displays size" , this.displays.size)
    console.log("admins size" , this.admins.size)
    ws.send(JSON.stringify({
      type: "init",
      questions: this.serializeQuestions(),
      users: this.audience.size
    }))
  }

  addAdmin(ws: ServerWebSocket<ClientData>) {
    this.removeClient(ws)
    this.admins.add(ws)
    console.log("audience size" , this.audience.size)
    console.log("displays size" , this.displays.size)
    console.log("admins size" , this.admins.size)
  }

  removeClient(ws: ServerWebSocket<ClientData>) {
    this.audience.delete(ws)  
    this.displays.delete(ws)
    this.admins.delete(ws)
  }

  createQuestion(text: string, options: string[]) {

    const question: Question = {
      id: crypto.randomUUID(),
      text,
      options: Object.fromEntries(options.map(o => [o, 0])),
      voters: new Set()
    }

    this.questions.push(question)
    this.broadcast()
    console.log(this.questions)
  }

  vote(userId: string, questionId: string, option: string) {

    const q = this.questions.find(q => q.id === questionId)
    if (!q) return
    if (q.voters.has(userId)) return

    if (!(option in q.options)) return;


    q.options[option]++
    q.voters.add(userId)

    this.broadcast()
  }

  serializeQuestions() {
    return this.questions.map(q => ({
      id: q.id,
      text: q.text,
      options: q.options
    }))
  }

  broadcast() {

    const payload = JSON.stringify({
      type: "update",
      questions: this.serializeQuestions(),
      users: this.audience.size
    })


    for (const ws of this.audience){
      ws.send(payload)
    }

    for (const ws of this.displays) {
      ws.send(payload)
    }

  }

  currentSize(){
    return this.audience.size;
  }
}

const pollSystem = new PollingSystem()

const server = Bun.serve<ClientData>({
  port: 3000,

  fetch(req, server) {

    const success = server.upgrade(req, {
      data: {
        userId: crypto.randomUUID(),
        role: "audience"
      }
    })

    return success ? undefined : new Response("upgrade failed", { status: 500 })
  },

  websocket: {

    open(ws) {
      pollSystem.addAudience(ws)
    },

    message(ws, message) {

      let data

      try {
        data = JSON.parse(message.toString())
      } catch {
        console.log("parsing error")
        return
      }

      if (data.type === "join_audience") {
        ws.data.role = "audience"
        pollSystem.addAudience(ws)
        return
      }

      if (data.type === "join_display") {
        ws.data.role = "display"
        pollSystem.addDisplay(ws)
        return
      }

      if (data.type === "join_admin") {
        ws.data.role = "admin"
        pollSystem.addAdmin(ws)
        return
      }

      if (data.type === "vote" && ws.data.role === "audience") {
        console.log(data.questionId , data.option)
        pollSystem.vote(
          ws.data.userId,
          data.questionId,
          data.option
        )

        return
      }

      if (data.type === "create_question" && ws.data.role === "admin") {
        pollSystem.createQuestion(
          data.text,
          data.options
        )

        return
      }
    },

    close(ws) {
      pollSystem.removeClient(ws)
    },

    drain(ws) {}
  }
})

console.log(`Polling server running on ${server.hostname}:${server.port}`)