/**
 * API client for Krishi Setu backend
 */

import axios, { AxiosInstance } from 'axios'
import { Language } from './languages'
import { LocationCoordinates } from './location'
import { API_BASE } from '@/config/api'

const API_URL = API_BASE

export interface ChatRequest {
  message: string
  language: Language
  location?: LocationCoordinates
}

export interface ChatResponse {
  response: string
  language: string
  success: boolean
}

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 60000, // 60 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * Send a chat message to the AI agent
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await this.client.post<ChatResponse>('/api/chat', request)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || error.message
        throw new Error(`Failed to send message: ${errorMessage}`)
      }
      throw error
    }
  }

  /**
   * Get list of supported languages
   */
  async getSupportedLanguages(): Promise<Array<{ code: string; name: string }>> {
    try {
      const response = await this.client.get('/api/languages')
      return response.data.languages
    } catch (error) {
      console.error('Failed to fetch supported languages:', error)
      return []
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/health')
      return response.data.status === 'healthy'
    } catch {
      return false
    }
  }
}

export const apiClient = new ApiClient()
