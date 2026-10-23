import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'preact/hooks';
import { sliceShape } from '../domain/geo';
import type { Leg, Plan } from '../domain/planner';
import { IDS, type Dataset, type Stop } from '../domain/types';
import type { Position } from '../state';

export const WALK_COLOR = '#757575';
const WALK_STYLE: L.PolylineOptions = { color: WALK_COLOR, weight: 4, dashArray: '2 8', lineCap: 'round' };
/** Trechos a pé do trajeto (Fase 1: linha reta; Fase 2: OSRM a pé). */
const WALKS: [string, string][] = [
  [IDS.rodRP, IDS.terminal],
  [IDS.ponto110, IDS.qualisol],
];

interface Props {
  dataset: Dataset;
  plan: Plan | null;
  position: Position | null;
  visible: boolean;
  /** incrementa para centralizar na posição atual */
  centerTick: number;
}

const TIPO_LABEL: Record<Stop['tipo'], string> = { embarque: 'Embarque', desembarque: 'Desembarque', referencia: 'Referência' };

function stopPopup(s: Stop): string {
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  return `<strong>${esc(s.nome)}</strong><br>${TIPO_LABEL[s.tipo]} · ${s.precisao === 'aproximado' ? '⚠️ posição aproximada' : '✅ confirmado'}${
    s.observacao ? `<br><small>${esc(s.observacao)}</small>` : ''
  }`;
}

function lineColor(d: Dataset, id: string): string {
  return d.lines.find((l) => l.id === id)?.cor ?? '#000';
}

function legPoints(d: Dataset, leg: Leg): [number, number][] {
  const stop = (id: string) => d.stops.find((s) => s.id === id);
  const a = stop(leg.de);
  const b = stop(leg.para);
  if (!a || !b) return [];
  if (leg.tipo === 'caminhada') return [[a.lat, a.lng], [b.lat, b.lng]];
  const shape = d.shapes.find((s) => s.linha === leg.linha && s.sentido === leg.sentido);
  if (!shape) return [[a.lat, a.lng], [b.lat, b.lng]];
  return sliceShape(shape.pontos, a, b);
}

export function MapView({ dataset, plan, position, visible, centerTick }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const base = useRef<L.LayerGroup | null>(null);
  const planLayer = useRef<L.LayerGroup | null>(null);
  const me = useRef<{ dot: L.CircleMarker; acc: L.Circle } | null>(null);
  const centeredOnce = useRef(false);

  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: false, attributionControl: true }).setView([-20.81, -49.33], 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      crossOrigin: true,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores do OpenStreetMap</a>',
    }).addTo(m);
    m.attributionControl.setPrefix(false);
    base.current = L.layerGroup().addTo(m);
    planLayer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => m.remove();
  }, []);

  // Linhas, caminhadas e pontos.
  useEffect(() => {
    const g = base.current!;
    g.clearLayers();
    const dim = plan !== null;
    for (const s of dataset.shapes) {
      const aprox = s.precisao === 'aproximado';
      L.polyline(s.pontos, { color: lineColor(dataset, s.linha), weight: 5, opacity: dim ? 0.2 : aprox ? 0.6 : 0.9 })
        .bindPopup(`${dataset.lines.find((l) => l.id === s.linha)?.nome ?? s.linha}${aprox ? '<br>⚠️ traçado aproximado' : ''}`)
        .addTo(g);
    }
    for (const [a, b] of WALKS) {
      const sa = dataset.stops.find((s) => s.id === a);
      const sb = dataset.stops.find((s) => s.id === b);
      if (sa && sb) L.polyline([[sa.lat, sa.lng], [sb.lat, sb.lng]], { ...WALK_STYLE, opacity: dim ? 0.3 : 0.9 }).addTo(g);
    }
    for (const s of dataset.stops) {
      const aprox = s.precisao === 'aproximado';
      L.circleMarker([s.lat, s.lng], {
        radius: s.tipo === 'referencia' ? 9 : 8,
        color: s.tipo === 'referencia' ? '#2e7d32' : '#212121',
        weight: 3,
        dashArray: aprox ? '3 3' : undefined,
        fillColor: s.tipo === 'referencia' ? '#66bb6a' : '#ffeb3b',
        fillOpacity: 1,
      })
        .bindPopup(stopPopup(s))
        .addTo(g);
    }
  }, [dataset, plan]);

  // Trajeto escolhido no planejador.
  useEffect(() => {
    const g = planLayer.current!;
    g.clearLayers();
    if (!plan) return;
    const bounds = L.latLngBounds([]);
    for (const leg of plan.legs) {
      const pts = legPoints(dataset, leg);
      if (pts.length === 0) continue;
      const style: L.PolylineOptions =
        leg.tipo === 'caminhada'
          ? { ...WALK_STYLE, weight: 6, color: '#424242' }
          : { color: lineColor(dataset, leg.linha!), weight: 8, opacity: 0.95 };
      L.polyline(pts, style).addTo(g);
      pts.forEach((p) => bounds.extend(p));
    }
    if (bounds.isValid()) map.current!.fitBounds(bounds, { paddingTopLeft: [32, 32], paddingBottomRight: [32, 220] });
  }, [plan, dataset]);

  // Minha posição.
  useEffect(() => {
    const m = map.current!;
    if (!position) return;
    const ll: L.LatLngExpression = [position.lat, position.lng];
    if (!me.current) {
      me.current = {
        acc: L.circle(ll, { radius: position.accuracy, color: '#1e88e5', weight: 1, fillOpacity: 0.12, interactive: false }).addTo(m),
        dot: L.circleMarker(ll, { radius: 8, color: '#fff', weight: 3, fillColor: '#1e88e5', fillOpacity: 1 }).addTo(m),
      };
    } else {
      me.current.dot.setLatLng(ll);
      me.current.acc.setLatLng(ll).setRadius(position.accuracy);
    }
    if (!centeredOnce.current && !plan) {
      centeredOnce.current = true;
      m.setView(ll, 15);
    }
  }, [position]);

  useEffect(() => {
    if (centerTick > 0 && position) map.current!.setView([position.lat, position.lng], Math.max(map.current!.getZoom(), 16));
  }, [centerTick]);

  // O mapa fica montado nas outras abas; ao voltar, recalcula o tamanho.
  useEffect(() => {
    if (visible) setTimeout(() => map.current?.invalidateSize(), 0);
  }, [visible]);

  return <div ref={el} class="map" />;
}
