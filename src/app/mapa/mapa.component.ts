import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Lugar } from '../interfaces/lugar';
import { HttpClient } from '@angular/common/http';
import { WebsocketService } from '../services/websocket.service';

@Component({
   selector: 'app-mapa',
   templateUrl: './mapa.component.html',
   styleUrl: './mapa.component.css'
})
export class MapaComponent implements OnInit {

   @ViewChild('map', {static: true}) mapElement?: ElementRef;
   map?: google.maps.Map;
   public marcadores: google.maps.Marker[] = [];
   public infoWindows: google.maps.InfoWindow[] = [];

   lugares: Lugar[] = [];

   constructor(
      private http: HttpClient,
      private wsService: WebsocketService,
   ) { }

   ngOnInit(): void {
      this.http.get<any>('http://localhost:5000/mapa').subscribe( lugares => {
         // console.log({lugares});
         this.loadLugares(lugares);

         this.cargarMapa();
      });

      this.escucharSockets();
   }

   private loadLugares( arrObjs:any ) {
      if (!arrObjs) return; // no hay elementos a cargar.
      console.log('entrando a cargar lugares', arrObjs);

      //destructuracion de arreglos de objectos
      for ( const [id, lugar] of Object.entries(arrObjs) ) {
         // console.log({lugar});
         const {id, nombre, lat, lng} = lugar as any;

         const nvoLugar: Lugar = {
            id: id,
            nombre: nombre,
            lat: lat,
            lng: lng,
         }
         // console.log({nvoLugar});

         this.lugares.push(nvoLugar);
      }
   }

   public escucharSockets() {

      //marcador-nuevo
      this.wsService.listen('marcador-nuevo').subscribe( marcador => {
         // console.log({marcador});
         this.agregarMarcador(marcador);
      });

      //marcador-mover
      this.wsService.listen('marcador-mover').subscribe( (marcador: any) => {
         const { id, lat, lng } = marcador;
         const marker: google.maps.Marker[]  =  this.marcadores.filter( marcador => marcador.getTitle() === id);

         const latLng = new google.maps.LatLng( lat, lng );
         marker[0].setPosition( latLng );
      });

      //marcador-borrar
      this.wsService.listen('marcador-borrar').subscribe( id => {
         const marker  =  this.marcadores.filter( marcador => marcador.getTitle() === id);
         marker[0].setMap( null );
      });
   }

   public cargarMapa() {

      const latLng = new google.maps.LatLng( 20.613681, -103.238701 );
      const mapaOpciones: google.maps.MapOptions = {
         center: latLng,
         zoom: 16,
         mapTypeId: google.maps.MapTypeId.ROADMAP,
      };

      this.map = new google.maps.Map( this.mapElement?.nativeElement, mapaOpciones );

      this.map.addListener('click', (coors) => {

         const nuevoMarcador: Lugar = {
            id: new Date().toISOString(),
            nombre: 'Nuevo lugar',
            lat: coors.latLng.lat(),
            lng: coors.latLng.lng(),
         }

         this.agregarMarcador( nuevoMarcador );
         //TODO: Emitir evento de socket, para informa que se creo un nuevo marcador.
         this.wsService.emit('marcador-nuevo', nuevoMarcador);
      });

      for( const lugar of this.lugares ) {
         this.agregarMarcador(lugar);
      }
   }

   public agregarMarcador( marcador: Lugar) {
      // console.log(marcador);
      const latLng = new google.maps.LatLng( marcador.lat, marcador.lng );
      const marker = new google.maps.Marker({
         map: this.map,
         animation: google.maps.Animation.DROP,
         position: latLng,
         draggable: true,
         title: marcador.id,
      });

      this.marcadores.push(marker);

      const contenido = `<b>${ marcador.nombre }</b>`;
      const infoWindow = new google.maps.InfoWindow({
         content: contenido,
      })

      this.infoWindows.push(infoWindow);

      google.maps.event.addDomListener(marker, 'click', () => {

         this.infoWindows.forEach( infoW => {
            infoW.close();
         });

         infoWindow.open( this.map, marker);
      });

      google.maps.event.addDomListener(marker, 'dblclick', (coors) => {
         // console.log(coors);

         //se destruye el marcador.
         marker.setMap( null );

         //TODO: Disparar evento de socket, para avisar que se destruyo el marcador.
         this.wsService.emit('marcador-borrar', marker.getTitle());
      });

      google.maps.event.addDomListener(marker, 'drag', (coors: any) => {

         const nvoMarcador = {
            lat: coors.latLng.lat(),
            lng: coors.latLng.lng(),
            nombre: marcador.nombre,
            id: marker.getTitle(),
         }
         // console.log(nvoMarcador);

         //TODO: Disparar evento de socket, para mover el marcador.
         this.wsService.emit('marcador-mover', nvoMarcador);
      });


   }

}
