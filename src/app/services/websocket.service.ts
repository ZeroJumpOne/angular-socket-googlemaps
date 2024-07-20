import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';

@Injectable({
   providedIn: 'root'
})
export class WebsocketService {

   public socketStatus: boolean = false;

   constructor(
      private socket: Socket,
   ) {
      this.checkStatus();
   }

   private checkStatus() {

      this.socket.on('connect', () => {
         console.log('Conectado al servidor');
         this.socketStatus = true;
      });

      this.socket.on('disconnect', () => {
         console.log('Desconectado del servidor');

         this.socketStatus = false;
      });
   }

   public emit(evento: string, payload?: any, callback?: Function) {
      // console.log('Emitiendo', evento);
      this.socket.emit(evento, payload, callback);
   }

   public listen(evento: string): Observable<any> {
      return this.socket.fromEvent(evento);

   }






}
