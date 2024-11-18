"use client"

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Message {
  role: 'user' | 'bot'
  content: string
}

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'bot', 
      content: '¡Hola! Soy tu asistente virtual. Puedo ayudarte a encontrar productos, responder preguntas sobre envíos y más. ¿En qué puedo ayudarte?' 
    }
  ])
  const [input, setInput] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = { role: 'user' as const, content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')

    // Simulated AI response - In production, connect to your AI service
    setTimeout(() => {
      const aiResponse = {
        role: 'bot' as const,
        content: getAIResponse(input)
      }
      setMessages(prev => [...prev, aiResponse])
    }, 1000)
  }

  const getAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase()
    if (input.includes('precio') || input.includes('costo')) {
      return 'Los precios de nuestros productos varían según el tipo y cantidad. ¿Te gustaría que te muestre algunas opciones específicas?'
    }
    if (input.includes('envío') || input.includes('envio') || input.includes('entrega')) {
      return 'Realizamos envíos a todo el país. El tiempo de entrega varía entre 24-72 horas hábiles según tu ubicación.'
    }
    return 'Gracias por tu pregunta. ¿Podrías darme más detalles para ayudarte mejor?'
  }

  return (
    <div className={`fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg transition-all duration-300 ${isOpen ? 'h-96' : 'h-14'}`}>
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold">Asistente Virtual</h3>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
        </Button>
      </div>
      {isOpen && (
        <>
          <div className="h-64 overflow-y-auto p-4">
            {messages.map((msg, index) => (
              <div key={index} className={`mb-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
                <span className={`inline-block p-2 rounded-lg ${
                  msg.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {msg.content}
                </span>
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Escribe tu mensaje..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <Button type="submit">Enviar</Button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}