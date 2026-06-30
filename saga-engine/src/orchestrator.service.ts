import { Injectable } from '@nestjs/common';
import { Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

// Tipos de Eventos Salientes
type RiskLevel = 'LOW' | 'HIGH';
type EventType = 'txn.Funds Reserved' | 'txn.FraudChecked' | 'txn.Committed' | 'txn.Reversed' | 'txn.Notified';

interface EventEnvelope<T> {
  id: string;
  type: string;
  version: number;
  ts: number;
  transactionId: string;
  userId: string;
  payload: T;
  correlationId?: string; // Usar el ID del comando como correlationId
}

@Injectable()
export class OrchestratorService {
  
  // Función auxiliar para emitir eventos
  private async emitEvent<T>(producer: Producer, eventType: EventType, transactionId: string, userId: string, payload: T, correlationId: string) {
    const event: EventEnvelope<T> = {
      id: uuidv4(),
      type: eventType,
      version: 1,
      ts: Date.now(),
      transactionId: transactionId,
      userId: userId,
      payload: payload,
      correlationId: correlationId,
    };

    console.log(`Emitting event: ${eventType} for TXN: ${transactionId}`);

    await producer.send({
      topic: 'txn.events', // Tópico de eventos
      messages: [{
        key: transactionId, // CLAVE DE PARTICIÓN (garantiza orden) [cite: 14, 104]
        value: JSON.stringify(event),
      }],
    });
  }

  // Idempotency: guardar IDs de comandos procesados
  private processedCommands: Set<string> = new Set();

  /**
   * Ejecuta la lógica de la Saga al recibir un comando.
   */
  async processCommand(command: EventEnvelope<any>, producer: Producer) {
    const { type, transactionId, userId, id: correlationId } = command;

    // --- IDEMPOTENCIA ---
    // Evita procesar dos veces el mismo comando con side-effects
    if (this.processedCommands.has(correlationId)) {
      console.log(`[Idempotencia] Comando ${correlationId} ya fue procesado. Ignorando.`);
      return;
    }

    if (type !== 'txn.TransactionInitiated') {
      console.warn(`Unhandled command type: ${type}`);
      return;
    }

    try {
      // --- 1. Funds Reservation ---
      // Simular reserva de fondos
      await this.emitEvent(producer, 'txn.Funds Reserved', transactionId, userId, { 
        ok: true, 
        holdId: uuidv4(), 
        amount: command.payload.amount 
      }, correlationId);

      // --- 2. Fraud Check Simulation ---
      // Simular el chequeo de fraude (ej. 70% LOW, 30% HIGH)
      const risk: RiskLevel = Math.random() < 0.7 ? 'LOW' : 'HIGH';
      
      await this.emitEvent(producer, 'txn.FraudChecked', transactionId, userId, { 
        risk: risk 
      }, correlationId);

      if (risk === 'LOW') {
        // --- 3a. LOW Risk: Commit Transaction ---
        await this.emitEvent(producer, 'txn.Committed', transactionId, userId, { 
          ledgerTxId: uuidv4() 
        }, correlationId);
      } else {
        // --- 3b. HIGH Risk: Reverse Transaction (Rollback) ---
        await this.emitEvent(producer, 'txn.Reversed', transactionId, userId, { 
          reason: 'Fraud Risk HIGH' 
        }, correlationId);
      }

      // --- 4. Notification ---
      await this.emitEvent(producer, 'txn.Notified', transactionId, userId, { 
        channels: ['EMAIL', 'PUSH'] 
      }, correlationId);

      // Guardar comando como procesado solo si todo fue exitoso
      this.processedCommands.add(correlationId);

    } catch (error) {
      // --- DLQ (Dead Letter Queue) ---
      // Si ocurre un error no recuperable, lo mandamos a txn.dlq
      console.error(`Error procesando comando ${correlationId}. Enviando a DLQ...`, error);
      await producer.send({
        topic: 'txn.dlq',
        messages: [{
          key: transactionId,
          value: JSON.stringify({
            originalCommand: command,
            error: error instanceof Error ? error.message : 'Error desconocido',
            ts: Date.now()
          })
        }],
      });
    }
  }
}