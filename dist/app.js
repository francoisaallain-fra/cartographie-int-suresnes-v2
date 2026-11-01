'use strict';
const $ = (id) => document.getElementById(id);
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const symbols = {
 plu:'<path d="M3 5 9 2l6 3 6-3v17l-6 3-6-3-6 3V5Z M9 2v17 M15 5v17"/>',
 transport:'<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 11h14M9 3v8M15 3v8M8 21l2-3m6 3-2-3"/><path d="M8 15h1m6 0h1"/>',
 road:'<path d="M7 2 3 22M17 2l4 20M12 3v4m0 4v3m0 4v3"/>',
 metro:'<path d="M2 21V11a10 10 0 0 1 20 0v10"/><rect x="7" y="7" width="10" height="11" rx="2"/><path d="M7 12h10M9 21l2-3m4 3-2-3M10 15h.01M14 15h.01"/>',
 tram:'<path d="M9 2h6l-3 3M12 5v2"/><rect x="5" y="7" width="14" height="12" rx="2"/><path d="M5 13h14M12 7v6M8 16h.01M16 16h.01M8 22l2-3m6 3-2-3"/>',
 train:'<path d="M6 3h12v12l-6 5-6-5V3ZM6 10h12M9 3v7M15 3v7M8 22l4-2 4 2"/><circle cx="12" cy="14" r="1.5"/>',
 school:'<path d="m2 9 10-5 10 5-10 5-10-5Zm4 3v6c4 3 8 3 12 0v-6M22 9v8"/>',
 nursery:'<circle cx="12" cy="13" r="8"/><path d="M12 5c-3-1-3-4-1-4M9 12h.01M15 12h.01M9 16c1.5 2 4.5 2 6 0"/>',
 health:'<path d="M5 2v2M11 2v2M5 3H4a1 1 0 0 0-1 1v4a5 5 0 0 0 10 0V4a1 1 0 0 0-1-1h-1M8 13v3a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="3"/>',
 pharmacy:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
 bakery:'<path d="M7 21 20 5a3 3 0 0 0-4-4L3 17a3 3 0 0 0 4 4ZM5 14l4 3m0-8 4 3m0-8 4 3"/>',
 office:'<path d="M5 21V3h14v18M3 21h18M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1M10 21v-3h4v3"/>',
 mixed:'<path d="M3 4h8v17H3zM13 8h8v13h-8zM1 21h22M6 8h2m-2 4h2m-2 4h2m10-4h2m-2 4h2"/>'
};
const svg = (type) => `<svg viewBox="0 0 24 24" aria-hidden="true">${symbols[type] || symbols.health}</svg>`;
const colors = {transport:'#707984',road:'#a5b0bb',nursery:'#ffffff',school:'#93d4ff',college:'#347fce',lycee:'#183f7a',health:'#00c86a',pharmacy:'#0fff7b',bakery:'#f6ad35',office:'#d72e83'};
const typeLabels={transport:'Gare / station',nursery:'Crèche / multi-accueil',school:'Établissement scolaire',health:'Structure de soins',pharmacy:'Pharmacie',bakery:'Boulangerie / pâtisserie',office:'Adresse d’immeuble ciblé'};
const state={radiusMeters:500,selected:null,enabled:{pluOfficeRetention:true,mixedBuildings:true,mosOffices:true,mosPavilion:false,mosCollective:false,mosActivities:false,plu:true,transport:true,equipment:false,offices:true,neighborhood:false},beforeSelection:null};
let map,tiles,bounds,data,sources,groups={},markers=new Map(),radiusLayer,zoneLabels=[],allPoints=[],roadLayers=[],railLayers=[];
const layerSpecs=[
 {id:'pluOfficeRetention',label:'Maintien des surfaces de bureau · PLU',sub:'5 périmètres réglementaires · bureaux existants',icon:'plu',color:'#ad5cff'},
 {id:'mixedBuildings',label:'Bâtiments mixtes potentiels',sub:'3 candidats · commerce + bureaux à confirmer',icon:'mixed',color:'#f18b3d'},
 {id:'mosOffices',label:'Bureaux · Mos 2025',sub:'25 emprises de bureaux · hors vacance',icon:'office',color:'#0da99a'},
 {id:'mosPavilion',label:'6 · Habitat pavillonnaire · Mos',sub:'134 emprises · catégorie 6',icon:'plu',color:'#a3bc43'},
 {id:'mosCollective',label:'7 · Habitat collectif · Mos',sub:'314 emprises · catégorie 7',icon:'plu',color:'#4f80e4'},
 {id:'mosActivities',label:'8 · Activités · Mos',sub:'64 emprises · catégorie 8, bureaux inclus',icon:'plu',color:'#c47b34'},
 {id:'plu',label:'Zonage PLU',sub:'55 secteurs · 21 libellés',icon:'plu',color:'#be9d22'},
 {id:'transport',label:'Transports structurants',sub:'6 gares · T2, L, U · 4 grands axes',icon:'transport',color:colors.transport},
 {id:'equipment',label:'Santé, crèches & établissements scolaires',sub:'18 structures de soins · 32 crèches · 30 établissements scolaires',icon:'health',color:colors.health},
 {id:'offices',label:'Immeubles ciblés',sub:'4 adresses · vacance non vérifiée',icon:'office',color:colors.office},
 {id:'neighborhood',label:'Aménités de quartier',sub:'24 commerces / activités · 13 pharmacies',icon:'bakery',color:colors.bakery}
];
const layerNamesKey='suresnes-layer-names';
const customLayerNames={};
try{
 const saved=JSON.parse(localStorage.getItem(layerNamesKey));
 if(saved&&typeof saved==='object'&&!Array.isArray(saved))for(const s of layerSpecs){
  const name=saved[s.id];
  if(typeof name==='string'&&name.trim()&&name.trim().length<=64)customLayerNames[s.id]=name.trim();
 }
}catch{}
function layerName(s){return customLayerNames[s.id]||s.label;}
function saveLayerName(s,name){
 const trimmed=name.trim();
 if(!trimmed||trimmed.length>64)return false;
 if(trimmed===s.label)delete customLayerNames[s.id];
 else customLayerNames[s.id]=trimmed;
 try{localStorage.setItem(layerNamesKey,JSON.stringify(customLayerNames));}catch{}
 const card=$('layer-controls').querySelector(`[data-layer-id="${s.id}"]`);
 card.querySelector('.layer-name').textContent=layerName(s);
 card.querySelector('.layer-expand').setAttribute('aria-label',`${card.dataset.collapsed==='true'?'Déplier':'Replier'} : ${layerName(s)}`);
 card.querySelector('.layer-drag').setAttribute('aria-label',`Déplacer : ${layerName(s)}`);
 card.querySelector('.layer-rename').setAttribute('aria-label',`Renommer : ${layerName(s)}`);
 $(`layer-${s.id}`).setAttribute('aria-label',`Afficher ${layerName(s)}`);
 $(`layerOpacity-${s.id}`).setAttribute('aria-label',`Opacité : ${layerName(s)}`);
 return true;
}
// Polygon defaults preserve the aerial-photo view while making the slider truthful:
// its percentage is the actual fill opacity, including fully opaque at 100%.
const polygonDefaultOpacity={pluOfficeRetention:10,mixedBuildings:25,mosOffices:20,mosPavilion:20,mosCollective:20,mosActivities:20,plu:5};
const layerOpacity=Object.fromEntries(layerSpecs.map(s=>[s.id,polygonDefaultOpacity[s.id]??100]));
const polygonOutlineOpacity=(id,base=1)=>Math.min(1,layerOpacity[id]/polygonDefaultOpacity[id]*base);
const amenityGroups=['transport','equipment','neighborhood'];
function groupFor(f){return ['transport','road'].includes(f.properties.kind)?'transport':['school','nursery','health'].includes(f.properties.kind)?'equipment':['bakery','pharmacy'].includes(f.properties.kind)?'neighborhood':'offices';}
function markerAppearance(p){
 let color=colors[p.kind],ink='#ffffff',variant=p.kind,icon=p.kind;
 if(p.kind==='school'){
  variant=p.category==='Lycée'?'lycee':p.category==='Collège'?'college':'primary';
  color=variant==='lycee'?colors.lycee:variant==='college'?colors.college:colors.school;
  if(variant==='primary')ink='#173b61';
 }else if(p.kind==='nursery')ink='#334155';
 else if(['health','pharmacy'].includes(p.kind))ink='#06462c';
 else if(p.kind==='bakery')ink='#663508';
 else if(p.kind==='transport'){
  const lines=(p.lines||[]).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  icon=/METRO/.test(lines)?'metro':/TRAM/.test(lines)?'tram':/TRAIN|RER/.test(lines)?'train':'transport';
 }
 return{color,ink,variant,icon};
}
function stationServices(p){return p.services||[];}
function isSncfStation(p){return p.kind==='transport'&&(p.services||[]).some(line=>['C01740','C01741'].includes(line.id));}
function serviceBadges(services){return services.map(line=>`<span class="service-badge" style="--line-color:${line.color}">${escapeHTML(line.label)}</span>`).join('');}
function featureIcon(f){
 const p=f.properties;
 if(p.kind==='transport'){
  return L.divIcon({className:'map-pin transport station-icon',html:`<div class="pin-disc" style="--color:${colors.transport};color:#fff">${svg('transport')}</div>`,iconSize:[28,28],iconAnchor:[14,14],popupAnchor:[100,37]});
 }
 const a=markerAppearance(p);
 return L.divIcon({className:`map-pin ${p.kind} ${a.variant}${p.audit?.added?' audit-added':''}${p.audit?.doubts?.length?' audit-doubt':''}${state.selected===f.id?' selected':''}`,html:`<div class="pin-disc" style="--color:${a.color};color:${a.ink}">${p.kind==='office'?p.number:svg(a.icon)}</div>${p.audit?.doubts?.length?'<span class="audit-question" aria-hidden="true">?</span>':''}`,iconSize:p.kind==='office'?[34,36]:[28,28],iconAnchor:p.kind==='office'?[17,34]:[14,14],popupAnchor:[0,-15]});
}
const hiddenCategories=new Set();
function categoryKey(p){const a=markerAppearance(p);return p.kind==='transport'?a.icon:a.variant;}
function legendItem(p,label){
 const a=markerAppearance(p),key=categoryKey(p);
 return `<button type="button" class="legend-item" data-category="${key}" data-group="${groupFor({properties:p})}" aria-pressed="false" aria-label="Afficher ou masquer : ${label}" title="Afficher ou masquer : ${label}"><span class="legend-symbol" style="background:${a.color};color:${a.ink}">${svg(a.icon)}</span>${label}</button>`;
}
function layerLegend(id){
 if(id==='transport')return `<div class="layer-legend"><button type="button" class="legend-item" data-category="stations" data-group="transport" aria-pressed="true" aria-label="Afficher ou masquer les gares et stations"><span class="legend-symbol" style="background:${colors.transport};color:white">${svg('train')}</span>Gares et stations</button>${data.rail.features.map(f=>{const p=f.properties;return `<button type="button" class="legend-item" data-category="rail-${p.id}" data-group="transport" aria-pressed="true" aria-label="Afficher ou masquer la ligne ${p.label}">${serviceBadges([p])}${p.mode==='TRAMWAY'?'Tram':'Transilien'} ${p.label}</button>`;}).join('')}${legendItem({kind:'road'},'Grands axes')}</div><p class="transport-scope">6 gares et stations, dont 3 SNCF, dans Suresnes et à 500 m de ses limites. Affichage indépendant des lignes.<br>Aucun RER ni métro dans ce périmètre.</p>`;

 const entries=id==='transport'?[[{kind:'transport',lines:['METRO']},'Métro'],[{kind:'transport',lines:['TRAM']},'Tram'],[{kind:'transport',lines:['TRAIN']},'Gare'],[{kind:'road'},'Grands axes']]:id==='equipment'?[[{kind:'nursery'},'Crèches'],[{kind:'school',category:'Ecole'},'Maternelles / primaires'],[{kind:'school',category:'Collège'},'Collèges'],[{kind:'school',category:'Lycée'},'Lycées'],[{kind:'health'},'Santé']]:id==='neighborhood'?[[{kind:'bakery'},'Boulangeries / pâtisseries'],[{kind:'pharmacy'},'Pharmacies']]:[];
 return entries.length?`<div class="layer-legend">${entries.map(([p,label])=>legendItem(p,label)).join('')}</div>`:'';
}
function row(label,value){return `<div class="popup-row"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`;}
function popup(f){
 const p=f.properties;
 if(p.kind==='transport')return `<div class="station-card"><strong class="station-card-name">${escapeHTML(p.name)}</strong><div class="station-card-services">${serviceBadges(stationServices(p))}${isSncfStation(p)?'<img class="station-card-sncf" src="https://upload.wikimedia.org/wikipedia/fr/a/a1/Logo_SNCF_%282011%29.svg" alt="SNCF" width="63" height="32" referrerpolicy="no-referrer">':''}</div></div>`;let body=`<div class="popup-tag">${escapeHTML(typeLabels[p.kind])}</div><h3 class="popup-title">${escapeHTML(p.name)}</h3><div class="popup-address">${escapeHTML(p.address || p.lines?.join(' · ') || '')}</div>`;
 if(p.kind==='office'){
  body+=row('Statut','Adresse ciblée · vacance non vérifiée');
  if(p.address_note)body+=`<p class="popup-notice">${escapeHTML(p.address_note)}</p>`;
  body+=`<p class="popup-notice">Les aménités recensées sont filtrées à ${radiusText()} autour du point d’adresse BAN. L’occupation et la disponibilité de l’immeuble ne sont pas établies.</p>`;
 }
 else body+=row('Catégorie',p.category || p.lines?.join(' · '));
 if(p.kind==='transport')body+=`<div class="popup-services">${serviceBadges(p.services)}</div>`+row('Situation',p.inside_city?'Dans Suresnes':`À ${p.distance_city_m} m des limites de Suresnes`);
 if(isSncfStation(p))body+='<img class="station-operator" src="https://upload.wikimedia.org/wikipedia/fr/a/a1/Logo_SNCF_%282011%29.svg" alt="SNCF" width="32" height="17" referrerpolicy="no-referrer">'+row('Réseau ferroviaire','Transilien SNCF')+`<a class="popup-link" href="https://www.transilien.com/fr/page-lignes/ligne-l" target="_blank" rel="noopener noreferrer">Source SNCF · gares de la ligne L ↗</a>`;
 if(p.kind==='nursery'){
  const shared=data.nurseries.features.filter(x=>x.geometry.coordinates.every((v,i)=>v===f.geometry.coordinates[i]));
  if(shared.length>1)body+=`<p class="popup-notice">À ce même point : ${shared.map(x=>escapeHTML(x.properties.name)).join(' · ')}.</p>`;
  body+=row('Millésime de la source',p.source_vintage);
 }
 if(state.selected && p.kind!=='office'){
  const near=selectedRadius().nearby.find(x=>x.id===f.id);
  if(near)body+=row('Distance au bureau',`${Math.round(near.distance_m)} m à vol d’oiseau`);
 }
 if(p.audit){
  const a=p.audit;
  body+=`<div class="audit-popup"><span class="audit-status ${a.doubts.length?'is-uncertain':''}">${escapeHTML(a.status)}</span>`;
  if(a.address_checked && a.address_checked!==p.address)body+=row('Adresse recoupée',a.address_checked);
  if(a.doubts.length)body+=`<div class="audit-warning"><strong>Points à vérifier</strong><ul>${a.doubts.map(d=>`<li>${escapeHTML(d)}</li>`).join('')}</ul></div>`;
  if(a.notes.length)body+=a.notes.map(n=>`<p class="audit-note">${escapeHTML(n)}</p>`).join('');
  if(a.sources.length)body+=`<details class="audit-evidence"><summary>Sources du croisement · 22/10/2026</summary>${a.sources.map(s=>`<a class="popup-link" href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.label)} ↗</a>`).join('')}</details>`;
  body+='</div>';
 }
 body+=`<small>${escapeHTML(p.precision)}</small><br><a class="popup-link" href="${escapeHTML(p.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(sources[p.source].name)} ↗</a>`;
 return body;
}
function radiusText(){return state.radiusMeters===1000?'1 km':state.radiusMeters+' m';}
function selectedRadius(id=state.selected){return data.radii.offices[id][state.radiusMeters];}
function allowedIds(){return state.selected?new Set(selectedRadius().nearby.map(x=>x.id)):null;}
function redrawRadius(){
 if(radiusLayer)map.removeLayer(radiusLayer);
 radiusLayer=L.geoJSON(selectedRadius().geometry,{style:{color:'#b4f1d2',weight:2,dashArray:'6 5',fillColor:'#7cdbbd',fillOpacity:.1},interactive:false}).addTo(map);
 $('radius-distance').textContent=radiusText();
 const office=data.offices.features.find(f=>f.id===state.selected);
 $('map-context').textContent=`Adresse ${office.properties.number} · rayon de ${radiusText()}`;
}
function mosOfficePopup(f){
 const p=f.properties;
 return `<div class="popup-tag">MOS 2025 · POSTE 45</div><h3 class="popup-title">Emprise de bureaux</h3>${row('Surface cartographiée',`${p.area_m2.toLocaleString('fr-FR')} m²`)}<p>Classification « Bureaux » du Mode d’occupation du sol 2025 de L’Institut Paris Region. Ce poste concerne les bureaux de plus de 5 000 m².</p><p class="popup-notice">Le contour décrit une occupation du sol, pas nécessairement un bâtiment unique. Il ne renseigne ni la vacance ni la disponibilité.</p><a class="popup-link" href="${sources.mos.url}" target="_blank" rel="noopener noreferrer">Source Mos 2025 ↗</a>`;
}
function mosGroupPopup(f){
 const p=f.properties;
 return `<div class="popup-tag">MOS 2025 · CATÉGORIE ${p.group_code}</div><h3 class="popup-title">${escapeHTML(p.group_name)}</h3>${row('Poste détaillé',`${p.class_code} · ${p.class_name}`)}${row('Surface cartographiée',`${p.area_m2.toLocaleString('fr-FR')} m²`)}<p class="popup-notice">Emprise d’occupation du sol en 2025, pas contour certifié d’un bâtiment ni preuve de son usage actuel.${p.group_code===8?' Cette catégorie inclut les bureaux déjà affichés dans la couche dédiée.':''}</p><a class="popup-link" href="${sources.mos.url}" target="_blank" rel="noopener noreferrer">Source Mos 2025 ↗</a>`;
}
function mixedBuildingPopup(f){
 const p=f.properties;
 return `<div class="popup-tag">CROISEMENT MOS · BDNB · INSEE BPE</div><h3 class="popup-title">Bâtiment mixte potentiel</h3>${row('Commerce repéré',p.bpe_shops.map(shop=>shop.name).join(' · '))}${row('Adresse du commerce',p.bpe_shops[0].address)}${row('Emprise bâtie',`${p.footprint_m2.toLocaleString('fr-FR')} m²`)}${row('Mos 2025','Bureaux · poste 45')}${row('BDNB','Usage principal tertiaire')}<p class="popup-notice">${escapeHTML(p.uncertainty)}</p><a class="popup-link" href="${sources.mos.url}" target="_blank" rel="noopener noreferrer">Mos ↗</a> · <a class="popup-link" href="${sources.bdnb.url}" target="_blank" rel="noopener noreferrer">BDNB ↗</a> · <a class="popup-link" href="${sources.bpe.url}" target="_blank" rel="noopener noreferrer">BPE ↗</a>`;
}
function pluOfficeRetentionPopup(f){
 const p=f.properties;
 return `<div class="popup-tag">PLU DE SURESNES · PRESCRIPTION GRAPHIQUE</div><h3 class="popup-title">Maintien des surfaces de bureau</h3>${row('Périmètre cartographié',`${p.area_m2.toLocaleString('fr-FR')} m²`)}${row('Règle','Dispositions générales · article 14')}<p>Dans ce secteur, le changement de destination des <strong>surfaces de bureaux existantes</strong> est limité aux destinations énumérées par le PLU. Un logement ou hébergement n’est admis que s’il reste minoritaire dans la surface de plancher du projet et intrinsèquement lié à l’activité principale du bâtiment.</p><p class="popup-notice">Certains commerces, services, équipements et activités restent autorisés. Les surfaces existantes de moins de 100 m² ne sont pas concernées par cette disposition. Le périmètre ne prouve pas la présence de bureaux sur chaque parcelle.</p><a class="popup-link" href="${p.rule_url}" target="_blank" rel="noopener noreferrer">Article 14 · règlement ↗</a> · <a class="popup-link" href="${p.plan_url}" target="_blank" rel="noopener noreferrer">Plan de zonage ↗</a>`;
}

function applyOpacity(id){
 const opacity=layerOpacity[id]/100;
 if(id==='plu'){
  groups.plu.setStyle({opacity:polygonOutlineOpacity(id,.95),fillOpacity:opacity});
  groups.plu.eachLayer(layer=>{if(layer.getElement())layer.getElement().style.pointerEvents=opacity===0?'none':'';});
  for(const {marker} of zoneLabels)marker.setOpacity(polygonOutlineOpacity(id));
 }else if(id==='pluOfficeRetention'){
  groups[id].setStyle({opacity:polygonOutlineOpacity(id),fillOpacity:opacity});
  groups[id].eachLayer(layer=>{if(layer.getElement())layer.getElement().style.pointerEvents=opacity===0?'none':'';});
 }else if(id==='mosOffices'||id==='mixedBuildings'||id==='mosPavilion'||id==='mosCollective'||id==='mosActivities'){
  const isMixed=id==='mixedBuildings';
  groups[id].setStyle({opacity:polygonOutlineOpacity(id,isMixed?.98:1),fillOpacity:opacity});
  groups[id].eachLayer(layer=>{if(layer.getElement())layer.getElement().style.pointerEvents=opacity===0?'none':'';});
 }else{
  for(const f of allPoints.filter(f=>groupFor(f)===id)){
   const marker=markers.get(f.id);marker.setOpacity(opacity);
   const el=marker.getElement();if(el){el.style.pointerEvents=opacity===0?'none':'';el.tabIndex=opacity===0?-1:0;}
  }
 }
 if(id==='transport')for(const road of roadLayers){
  road.halo.setStyle({opacity:opacity*.4});road.line.setStyle({opacity});
  road.line.eachLayer(layer=>{if(layer.getElement())layer.getElement().style.pointerEvents=opacity===0?'none':'';});
 }
 if(id==='transport')for(const rail of railLayers)for(const part of rail.parts){
  part.setStyle({opacity});const el=part.getElement();if(el&&part.options.interactive)el.style.pointerEvents=opacity===0?'none':'';
 }
 const control=$('layerOpacity-'+id);
 control.value=layerOpacity[id];control.setAttribute('aria-valuetext',layerOpacity[id]+' % d’opacité');
 $('layerOpacity-value-'+id).textContent=layerOpacity[id]+' %';
}
function updateRoads(){
 roadLayers=[];
 if(hiddenCategories.has('road'))return;
 for(const f of data.roads.features){
  const geometry=state.selected?selectedRadius().roads[f.id]:f.geometry;
  if(!geometry)continue;
  const feature={...f,geometry};
  const halo=L.geoJSON(feature,{pane:'road-light',interactive:false,style:{color:'#ffffff',weight:10,opacity:layerOpacity.transport/100*.4,className:'road-glow'}});
  const line=L.geoJSON(feature,{pane:'road-light',bubblingMouseEvents:false,style:{color:'#ffffff',weight:3.5,lineCap:'round',lineJoin:'round',opacity:layerOpacity.transport/100,className:'road-axis'},onEachFeature:(feature,layer)=>{
   const p=feature.properties;
   layer.bindTooltip(escapeHTML(p.name),{sticky:true});
   layer.bindPopup(`<div class="popup-tag">AXE ROUTIER STRUCTURANT</div><h3 class="popup-title">${escapeHTML(p.name)}</h3>${row('Repère',p.ref)}<p>Tracé OpenStreetMap du 22 octobre 2026, limité à Suresnes et à une bande de 500 m autour de ses limites${state.selected?' et au rayon de '+radiusText():''}.</p><a href="${escapeHTML(p.source_url)}" target="_blank" rel="noopener noreferrer">© OpenStreetMap · ODbL ↗</a><br><a href="${escapeHTML(p.official_url)}" target="_blank" rel="noopener noreferrer">Repérage : Département des Hauts-de-Seine ↗</a>`);
   layer.on('click',handleMapClick);
  }});
  groups.transport.addLayer(halo);groups.transport.addLayer(line);
  roadLayers.push({id:f.id,halo,line});
 }
}
// Pixel offsets separate shared L/U tracks without modifying source coordinates.
const OffsetRail=L.Polyline.extend({
 _project(){
  L.Polyline.prototype._project.call(this);
  const offset=this.options.railOffset||0;if(!offset)return;
  this._rings=this._rings.map(ring=>{
   if(ring.length<2)return ring;
   const first=ring[0],last=ring[ring.length-1],sign=first.y===last.y?(first.x<last.x?1:-1):(first.y<last.y?1:-1);
   return ring.map((p,i)=>{
    const before=ring[Math.max(0,i-1)],after=ring[Math.min(ring.length-1,i+1)],dx=after.x-before.x,dy=after.y-before.y,length=Math.hypot(dx,dy)||1;
    const moved=L.point(p.x-dy/length*offset*sign,p.y+dx/length*offset*sign);
    this._rawPxBounds.extend(moved);return moved;
   });
  });
  this._updateBounds();
 }
});
function updateRail(){
 railLayers=[];
 for(const f of data.rail.features){
  const p=f.properties;if(hiddenCategories.has('rail-'+p.id))continue;
  const geometry=state.selected?selectedRadius().rail[f.id]:f.geometry;
  if(!geometry)continue;
  const parts=[],coords=geometry.type==='LineString'?[geometry.coordinates]:geometry.coordinates;
  for(const coordinates of coords){
   const latlngs=coordinates.map(([x,y])=>[y,x]);
   const base={pane:'data-transport',opacity:layerOpacity.transport/100,railOffset:p.label==='L'?-2.3:p.label==='U'?2.3:0,lineCap:'round',lineJoin:'round',smoothFactor:0.3};
   const line=new OffsetRail(latlngs,{...base,color:p.color,weight:3,interactive:true,bubblingMouseEvents:false,className:'rail-line rail-'+p.label});
   line.bindTooltip(p.mode==='TRAMWAY'?'Tram '+p.label:'Transilien '+p.label,{sticky:true});
   line.bindPopup(`<div class="popup-tag">LIGNE DE TRANSPORT</div><h3 class="popup-title">${escapeHTML(p.name)}</h3>${serviceBadges([p])}<p>Tracé et couleur officiels Île-de-France Mobilités · 21 octobre 2026.</p><a href="${sources.rail.url}" target="_blank" rel="noopener noreferrer">Source du tracé ↗</a>`);
   line.on('click',handleMapClick);
   groups.transport.addLayer(line);parts.push(line);
  }
  railLayers.push({id:f.id,parts});
 }
}
function updateLayers(){
 const allowed=allowedIds();let visible=0;
 for(const spec of layerSpecs){
  const group=groups[spec.id];
  if(!['plu','pluOfficeRetention','mosOffices','mixedBuildings','mosPavilion','mosCollective','mosActivities'].includes(spec.id)){
   group.clearLayers();
   if(spec.id==='transport'){updateRoads();updateRail();}
   for(const f of allPoints.filter(f=>groupFor(f)===spec.id)){
    const marker=markers.get(f.id);marker.setIcon(featureIcon(f));marker.setPopupContent(popup(f));
    if((f.properties.kind==='transport'?!hiddenCategories.has('stations'):!hiddenCategories.has(categoryKey(f.properties)))&&(spec.id==='offices'||!allowed||allowed.has(f.id))){group.addLayer(marker);if(state.enabled[spec.id])visible++;}
   }
  }
  if(state.enabled[spec.id])group.addTo(map);else map.removeLayer(group);
  $(`layer-${spec.id}`).checked=state.enabled[spec.id];
 }
 document.querySelectorAll('[data-category]').forEach(el=>{
  const active=state.enabled[el.dataset.group]&&!hiddenCategories.has(el.dataset.category);
  el.setAttribute('aria-pressed',String(active));
  el.disabled=!state.enabled[el.dataset.group];
 });
 updateZoneLabels();
 for(const s of layerSpecs)applyOpacity(s.id);
 $('visible-count').textContent=`${visible} points affichés${state.enabled.pluOfficeRetention?' · 5 périmètres maintien bureaux':''}${state.enabled.mosOffices?' · 25 emprises bureaux':''}${state.enabled.mixedBuildings?' · 3 mixtes potentiels':''}${['mosPavilion','mosCollective','mosActivities'].map(id=>state.enabled[id]?' · '+groups[id].getLayers().length+' emprises '+layerSpecs.find(s=>s.id===id).label.split(' · ')[1].toLowerCase():'').join('')}${state.enabled.transport&&roadLayers.length?' · '+roadLayers.length+' axes':''}${state.enabled.transport&&railLayers.length?' · '+railLayers.length+' lignes':''}${state.selected?' · aménités à '+radiusText():''}`;
 document.querySelectorAll('.office-item').forEach(el=>el.classList.toggle('active',el.dataset.id===state.selected));
 if(state.selected){
  const office=data.offices.features.find(f=>f.id===state.selected);const nearby=allPoints.filter(f=>allowed.has(f.id));
  $('radius-count').textContent=`${nearby.length} aménités recensées : ${nearby.filter(f=>f.properties.kind==='transport').length} transport(s), ${nearby.filter(f=>['school','nursery','health'].includes(f.properties.kind)).length} santé / crèche / école, ${nearby.filter(f=>['bakery','pharmacy'].includes(f.properties.kind)).length} de quartier.`;
 }
}
function updateZoneLabels(){if(!map)return;for(const {marker,area} of zoneLabels){marker.setOpacity(polygonOutlineOpacity('plu'));if(state.enabled.plu&&(map.getZoom()>=16||area>=20000))marker.addTo(map);else map.removeLayer(marker);}}
function selectOffice(f){
 if(!state.selected)state.beforeSelection={...state.enabled};
 state.selected=f.id;state.enabled.offices=true;for(const id of amenityGroups)state.enabled[id]=true;
 redrawRadius();
 $('radius-panel').hidden=false;$('radius-name').textContent=f.properties.name;
 updateLayers();map.fitBounds(radiusLayer.getBounds(),{padding:[55,55],maxZoom:17,animate:false});markers.get(f.id).openPopup();
 if(window.innerWidth<=720)$('map').scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function clearSelection(restore=true){
 if(radiusLayer){map.removeLayer(radiusLayer);radiusLayer=null;}
 state.selected=null;if(restore&&state.beforeSelection)state.enabled={...state.beforeSelection};state.beforeSelection=null;
 $('radius-panel').hidden=true;$('map-context').textContent='Suresnes · vue communale';map.closePopup();updateLayers();
}
function showCityView(){
 if(state.selected)clearSelection();
 map.stop();map.fitBounds(bounds,{padding:[24,24],animate:false});
}
function setupMapRotation(){
 const surface=$('map'),north=$('north-reset');
 let press=null,gesture=null,suppressClick=false;
 const isMapControl=event=>{
  if(event.target instanceof Element&&event.target.closest('.map-pin,.leaflet-popup,.leaflet-control,button,a,input,select,textarea'))return true;
  return [...surface.querySelectorAll('.map-pin')].some(marker=>{
   const rect=marker.getBoundingClientRect();
   return event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom;
  });
 };
 const finish=()=>{
  if(!press)return;
  const wasRotating=!!gesture;
  press=null;gesture=null;surface.classList.remove('is-rotating');
  if(wasRotating)map.dragging.enable();
  document.removeEventListener('mousemove',move,true);
  document.removeEventListener('mouseup',end,true);
  window.removeEventListener('blur',finish);
 };
 const startRotation=()=>{
  if(!press||gesture)return;
  // Disabling Leaflet's drag handler also ends a pan already under way.
  map.dragging.disable();
  gesture={startX:press.x,startBearing:map.getBearing(),moved:false};
  surface.classList.add('is-rotating');
 };
 const move=event=>{
  if(!press)return;
  if(!(event.buttons&1)){finish();return;}
  if(!gesture){press.x=event.clientX;press.y=event.clientY;return;}
  event.preventDefault();event.stopImmediatePropagation();
  const dx=event.clientX-gesture.startX;
  if(Math.abs(dx)>3)gesture.moved=true;
  // A horizontal drag changes the bearing, like a map rotation gesture.
  map.setBearing(gesture.startBearing+dx*.4);
 };
 const end=event=>{
  if(!press)return;
  if(gesture){
   if(gesture.moved){suppressClick=true;setTimeout(()=>{suppressClick=false;},0);}
   event.preventDefault();event.stopImmediatePropagation();
  }
  finish();
 };
 surface.addEventListener('mousedown',event=>{
  if(event.button!==0||isMapControl(event))return;
  press={x:event.clientX,y:event.clientY};
  document.addEventListener('mousemove',move,true);
  document.addEventListener('mouseup',end,true);
  window.addEventListener('blur',finish,{once:true});
  if(event.ctrlKey||event.metaKey){
   event.preventDefault();event.stopImmediatePropagation();startRotation();
  }
 },true);
 document.addEventListener('keydown',event=>{
  if(press&&!gesture&&(event.key==='Control'||event.key==='Meta'))startRotation();
 },true);
 surface.addEventListener('contextmenu',event=>{if(gesture){event.preventDefault();event.stopImmediatePropagation();}},true);
 surface.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopPropagation();suppressClick=false;}},true);
 map.on('rotate',()=>{
  const bearing=map.getBearing();
  north.classList.toggle('is-rotated',Math.abs(bearing)>0.5&&Math.abs(bearing-360)>0.5);
  north.querySelector('span').style.transform=`rotate(${-bearing}deg)`;
 });
 north.addEventListener('click',()=>map.setBearing(0));
}
function handleMapClick(event){
 if(!state.selected)return;
 // Hit-test the same geodesic polygon that draws the selected perimeter.
 const ring=selectedRadius().geometry.coordinates[0];
 const {lng:x,lat:y}=event.latlng;
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [xi,yi]=ring[i], [xj,yj]=ring[j];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
 }
 if(!inside)showCityView();
}
function syncLayerOrder(){
 const cards=[...$('layer-controls').children];
 cards.forEach((card,i)=>{
  const zIndex=450+(cards.length-i)*10;
  map.getPane('data-'+card.dataset.layerId).style.zIndex=zIndex;
  map.getPane('data-'+card.dataset.layerId+'-markers').style.zIndex=zIndex;
 });
 map.getPane('road-light').style.zIndex=Number(map.getPane('data-transport').style.zIndex)-1;
 try{localStorage.setItem('suresnes-layer-order',JSON.stringify(cards.map(c=>c.dataset.layerId)));}catch{}
}
function setupLayerReordering(){
 const list=$('layer-controls');
 try{
  const saved=JSON.parse(localStorage.getItem('suresnes-layer-order'));
  if(Array.isArray(saved)&&new Set(saved).size===saved.length&&saved.every(id=>layerSpecs.some(s=>s.id===id))){
   const added=layerSpecs.map(s=>s.id).filter(id=>!saved.includes(id));
   [...added,...saved].forEach(id=>list.append(list.querySelector('[data-layer-id="'+id+'"]')));
  }
 }catch{}
 let dragging=null;
 list.addEventListener('dragstart',e=>{
  const handle=e.target.closest('.layer-drag');if(!handle)return;
  dragging=handle.closest('.layer-card');dragging.classList.add('dragging');
  e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragging.dataset.layerId);
 });
 list.addEventListener('dragover',e=>{
  if(!dragging)return;e.preventDefault();e.dataTransfer.dropEffect='move';
  const target=e.target.closest('.layer-card');if(!target||target===dragging)return;
  const box=target.getBoundingClientRect();
  list.insertBefore(dragging,e.clientY<box.top+box.height/2?target:target.nextSibling);
 });
 const finish=()=>{if(dragging){dragging.classList.remove('dragging');dragging=null;syncLayerOrder();}};
 list.addEventListener('drop',e=>{if(dragging)e.preventDefault();finish();});
 list.addEventListener('dragend',finish);
 list.addEventListener('keydown',e=>{
  if(!e.target.matches('.layer-drag')||!['ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();const card=e.target.closest('.layer-card');
  if(e.key==='ArrowUp'&&card.previousElementSibling)list.insertBefore(card,card.previousElementSibling);
  else if(e.key==='ArrowDown'&&card.nextElementSibling)list.insertBefore(card.nextElementSibling,card);
  e.target.focus();syncLayerOrder();
 });
 syncLayerOrder();
}
const collapsedLayersKey='suresnes-collapsed-layers';
let collapsedLayers=new Set();
try{
 const saved=JSON.parse(localStorage.getItem(collapsedLayersKey));
 if(Array.isArray(saved))collapsedLayers=new Set(saved.filter(id=>layerSpecs.some(s=>s.id===id)));
}catch{}
function setLayerCollapsed(card,collapsed){
 const button=card.querySelector('.layer-expand');
 const body=card.querySelector('.layer-body');
 const rename=card.querySelector('.layer-rename');
 const name=card.querySelector('.layer-name').textContent;
 card.dataset.collapsed=String(collapsed);
 button.setAttribute('aria-expanded',String(!collapsed));
 button.setAttribute('aria-label',`${collapsed?'Déplier':'Replier'} : ${name}`);
 button.title=`${collapsed?'Déplier':'Replier'} les réglages de ${name}`;
 body.hidden=collapsed;
 if(collapsed){
  body.querySelector('.layer-rename-form').hidden=true;
  rename.setAttribute('aria-expanded','false');
  collapsedLayers.add(card.dataset.layerId);
 }else collapsedLayers.delete(card.dataset.layerId);
 try{localStorage.setItem(collapsedLayersKey,JSON.stringify([...collapsedLayers]));}catch{}
}
function buildControls(){
 $('radius-range').addEventListener('input',e=>{
  state.radiusMeters=Number(e.target.value);
  $('radius-range-value').textContent=radiusText();e.target.setAttribute('aria-valuetext',radiusText());
  if(state.selected){redrawRadius();updateLayers();}
 });
 $('radius-range').addEventListener('change',()=>{
  if(state.selected){map.closePopup();map.stop();map.fitBounds(radiusLayer.getBounds(),{padding:[55,55],maxZoom:17,animate:false});}
 });

 $('layer-controls').innerHTML=layerSpecs.map(s=>`<div class="layer-card" data-layer-id="${s.id}"><button type="button" class="layer-drag" draggable="true" aria-label="Déplacer : ${escapeHTML(layerName(s))}" title="Glisser pour déplacer · flèches haut/bas au clavier">⠿</button><div class="layer-main"><button type="button" class="layer-expand" aria-expanded="true" aria-controls="layer-body-${s.id}" aria-label="Replier : ${escapeHTML(layerName(s))}" title="Replier les réglages de ${escapeHTML(layerName(s))}"><span class="layer-disclosure" aria-hidden="true"></span><span class="layer-icon ${s.icon}" style="--color:${s.color}">${svg(s.icon)}</span><span class="layer-copy"><strong class="layer-name">${escapeHTML(layerName(s))}</strong><small>${escapeHTML(s.sub)}</small></span></button><input id="layer-${s.id}" type="checkbox" ${state.enabled[s.id]?'checked':''} aria-label="Afficher ${escapeHTML(layerName(s))}"></div><div id="layer-body-${s.id}" class="layer-body"><button type="button" class="layer-rename" aria-label="Renommer : ${escapeHTML(layerName(s))}" aria-expanded="false" aria-controls="rename-form-${s.id}" title="Renommer cette couche">✎</button><form id="rename-form-${s.id}" class="layer-rename-form" hidden><label for="rename-input-${s.id}">Nom de la couche</label><input id="rename-input-${s.id}" type="text" maxlength="64" required autocomplete="off" value="${escapeHTML(layerName(s))}"><div class="layer-rename-actions"><button type="submit">Enregistrer</button><button type="button" class="rename-cancel">Annuler</button><button type="button" class="rename-reset">Nom d’origine</button></div><small>Nom enregistré dans ce navigateur.</small></form>${layerLegend(s.id)}<div class="layerOpacity-control"><div><span id="layerOpacity-label-${s.id}">Opacité</span><output id="layerOpacity-value-${s.id}" for="layerOpacity-${s.id}">100 %</output></div><input type="range" id="layerOpacity-${s.id}" min="0" max="100" step="5" value="100" aria-label="Opacité : ${escapeHTML(layerName(s))}" aria-valuetext="100 % d’opacité"><div class="layerOpacity-scale"><span>Transparent</span><span>Opaque</span></div></div></div></div>`).join('');
 setupLayerReordering();
 for(const s of layerSpecs){
  const card=$('layer-controls').querySelector(`[data-layer-id="${s.id}"]`);
  const button=card.querySelector('.layer-rename');
  const expand=card.querySelector('.layer-expand');
  const form=card.querySelector('.layer-rename-form');
  const input=form.querySelector('input');
  const close=()=>{form.hidden=true;button.setAttribute('aria-expanded','false');button.focus();};
  button.addEventListener('click',()=>{
   if(!form.hidden){close();return;}
   form.hidden=false;button.setAttribute('aria-expanded','true');input.value=layerName(s);input.focus();input.select();
  });
  form.addEventListener('submit',e=>{e.preventDefault();if(saveLayerName(s,input.value))close();});
  form.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});
  form.querySelector('.rename-cancel').addEventListener('click',close);
  form.querySelector('.rename-reset').addEventListener('click',()=>{saveLayerName(s,s.label);close();});
  expand.addEventListener('click',()=>setLayerCollapsed(card,card.dataset.collapsed!=='true'));
  setLayerCollapsed(card,collapsedLayers.has(s.id));
 }
 for(const s of layerSpecs)$(`layer-${s.id}`).addEventListener('change',e=>{
  state.enabled[s.id]=e.target.checked;
  if(s.id==='offices'&&!e.target.checked&&state.selected){clearSelection(false);map.fitBounds(bounds,{padding:[24,24]});}
  else updateLayers();
 });
 for(const s of layerSpecs)$('layerOpacity-'+s.id).addEventListener('input',e=>{
  layerOpacity[s.id]=Number(e.target.value);applyOpacity(s.id);
 });
 document.querySelectorAll('[data-category]').forEach(el=>el.addEventListener('click',()=>{
  const key=el.dataset.category,group=el.dataset.group;
  if(!state.enabled[group])return;
  if(hiddenCategories.has(key))hiddenCategories.delete(key);
  else hiddenCategories.add(key);
  updateLayers();
 }));
 $('office-list').innerHTML=data.offices.features.map(f=>`<button class="office-item" data-id="${escapeHTML(f.id)}"><span class="office-number">${f.properties.number}</span><span>${escapeHTML(f.properties.name)}<small>Adresse BAN · vacance non vérifiée</small></span></button>`).join('');
 document.querySelectorAll('.office-item').forEach(el=>el.addEventListener('click',()=>selectOffice(data.offices.features.find(f=>f.id===el.dataset.id))));
 $('clear-radius').addEventListener('click',showCityView);
 $('hide-all').addEventListener('click',()=>{if(state.selected)clearSelection(false);for(const key in state.enabled)state.enabled[key]=false;updateLayers();});
 $('reset-view').addEventListener('click',showCityView);
}
function buildSources(){
 const lines=[['Fond photo','ign','Flux IGN testé · couverture de la ville'],['Maintien des surfaces de bureau · PLU','pluOfficeRetention','5 prescriptions surfaciques officielles du PLU 2024'],['Bureaux Mos 2025','mos','25 emprises classées Bureaux (poste 45) dans Suresnes'],['Mixité potentielle','bdnb','3 groupes bâtis tertiaires avec un commerce BPE dans une emprise Mos Bureaux'],['Commerces du croisement','bpe','203 équipements commerciaux BPE 2025 examinés ; stations de recharge exclues'],['Zonage PLU','plu','55 polygones · 21 libellés'],['Gares et stations','transport','6 gares : 3 dans Suresnes + Puteaux, Les Coteaux et Le Val d’Or'],['Lignes ferrées','rail','Tram T2 · Transilien L et U · couleurs officielles'],['Axes routiers','roads','4 axes : quais de Seine, Henri-Sellier / pont, Washington et Franklin-Roosevelt'],['Écoles','education','30 établissements : 23 écoles, 5 collèges, 2 lycées'],['Petite enfance','childcare','32 établissements : 20 multi-accueils et 12 micro-crèches'],['Santé','health','18 structures de soins (13 initiales + 5 ajoutées) ; 13 pharmacies conservées'],['Quartier','crosscheck','24 commerces / activités : 18 initiaux, 1 fournil recoupé et 5 activités déclarées à vérifier'],['Immeubles ciblés','provided_addresses','4 adresses communiquées et géocodées au numéro dans Suresnes']];
 lines.splice(3,0,['6 · Habitat pavillonnaire · Mos','mosGroups','134 emprises, 1 enregistrement sans géométrie'],['7 · Habitat collectif · Mos','mosGroups','314 emprises'],['8 · Activités · Mos','mosGroups','64 emprises, dont 25 de bureaux']);
 $('sources-table').innerHTML='<table><thead><tr><th>Couche</th><th>Source & accès</th><th>Test & millésime</th></tr></thead><tbody>'+lines.map(([label,id,result])=>{const s=sources[id];return `<tr><td>${label}</td><td><a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.name)} ↗</a><small>${escapeHTML(s.format)} · ${escapeHTML(s.license)}</small></td><td>${escapeHTML(result)}<small>${escapeHTML(s.vintage)}</small><small>${escapeHTML(s.note)}</small></td></tr>`;}).join('')+'</tbody></table>';
}
async function start(){
 try{
  const dataVersion='2026-10-29-mos-groupes';
  const names=['commune','plu','plu-maintien-bureaux','transport','schools','nurseries','health','neighborhood','offices','roads','rail','transport-extent','mos-offices','mixed-buildings','mos-pavillonnaire','mos-collectif','mos-activites'];
  const loaded=await Promise.all([...names.map(n=>fetch(`data/${n}.geojson?v=${dataVersion}`).then(r=>{if(!r.ok)throw Error(n);return r.json();})),fetch(`data/sources.json?v=${dataVersion}`).then(r=>r.json()),fetch(`data/radii.json?v=${dataVersion}`).then(r=>{if(!r.ok)throw Error('radii');return r.json();})]);
  data=Object.fromEntries(names.map((n,i)=>[n,loaded[i]]));sources=loaded[names.length];data.radii=loaded[names.length+1];
  map=L.map('map',{zoomControl:false,preferCanvas:false,minZoom:12,maxZoom:20,zoomSnap:.25,zoomDelta:.5,rotate:true,dragRotate:false,shiftKeyRotate:false,touchRotate:false,rotateControl:false});L.control.zoom({position:'topright'}).addTo(map);L.control.scale({imperial:false,position:'bottomleft',maxWidth:120}).addTo(map);setupMapRotation();
  let loadedTiles=0,failedTiles=0;
  tiles=L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEROW={y}&TILECOL={x}&TILEMATRIX={z}',{attribution:'Photo © <a href="https://www.ign.fr/">IGN</a> · 2024 | Données : Mos © <a href="https://www.institutparisregion.fr/">L’Institut Paris Region</a>, CSTB/BDNB, Insee/BPE, GPU, IDFM, Éducation, FINESS, Dépt. 92, © <a href="https://www.openstreetmap.org/copyright">OSM</a>',maxNativeZoom:19,maxZoom:20});
  tiles.on('tileload',()=>{loadedTiles++;$('map-error').hidden=true;});tiles.on('tileerror',()=>{failedTiles++;if(loadedTiles===0&&failedTiles>=3)$('map-error').hidden=false;});tiles.addTo(map);
  $('retry-tiles').addEventListener('click',()=>{loadedTiles=0;failedTiles=0;tiles.redraw();});
  const boundary=L.geoJSON(data.commune,{style:{color:'#effff1',weight:2,dashArray:'5 5',fill:false},interactive:false}).addTo(map);bounds=L.geoJSON(data['transport-extent']).getBounds();map.fitBounds(bounds,{padding:[24,24]});
  // Leaflet Rotate keeps imagery and paths in one rotating pane, while it
  // repositions upright markers in a separate non-rotating pane.
  const pathParent=map.getPanes().overlayPane.parentElement;
  const markerParent=map.getPanes().markerPane.parentElement;
  for(const s of layerSpecs){
   map.createPane('data-'+s.id,pathParent);
   map.createPane('data-'+s.id+'-markers',markerParent);
  }
  map.createPane('road-light',pathParent).style.mixBlendMode='screen';
  groups.plu=L.geoJSON(data.plu,{pane:'data-plu',style:{color:'#f8d944',weight:1,opacity:.95,fillOpacity:.05,fillColor:'#ffdf4a'},onEachFeature:(f,l)=>{
   l.bindPopup(`<div class="popup-tag">ZONAGE PLU</div><h3 class="popup-title">Secteur ${escapeHTML(f.properties.libelle)}</h3><p>Document 92073_PLU_20240626<br>Publié le 15 janvier 2025</p><p class="popup-notice">Le secteur seul ne détermine pas les droits à construire.</p><a href="${sources.plu.url}" target="_blank" rel="noopener noreferrer">Consulter les pièces du PLU ↗</a>`);
   l.on('click',handleMapClick);
   const [x,y]=f.properties.label_point;zoneLabels.push({area:f.properties.area_m2,marker:L.marker([y,x],{pane:'data-plu-markers',interactive:false,keyboard:false,icon:L.divIcon({className:'zone-label',html:escapeHTML(f.properties.libelle),iconSize:[46,16],iconAnchor:[23,8]})})});
  }});
  groups.pluOfficeRetention=L.geoJSON(data['plu-maintien-bureaux'],{pane:'data-pluOfficeRetention',style:{color:'#ad5cff',weight:1,dashArray:'7 5',opacity:1,fillColor:'#ad5cff',fillOpacity:.1},onEachFeature:(f,l)=>{l.bindPopup(pluOfficeRetentionPopup(f));l.bindTooltip('PLU · maintien des surfaces de bureau',{sticky:true});l.on('click',handleMapClick);}});
  groups.mosOffices=L.geoJSON(data['mos-offices'],{pane:'data-mosOffices',style:{color:'#37e3cd',weight:1,opacity:1,fillColor:'#37e3cd',fillOpacity:.2},onEachFeature:(f,l)=>{l.bindPopup(mosOfficePopup(f));l.bindTooltip('Bureaux · Mos 2025',{sticky:true});l.on('click',handleMapClick);}});
  groups.mixedBuildings=L.geoJSON(data['mixed-buildings'],{pane:'data-mixedBuildings',style:{color:'#ff9b42',weight:1,opacity:.98,fillColor:'#fa8733',fillOpacity:.25},onEachFeature:(f,l)=>{l.bindPopup(mixedBuildingPopup(f));l.bindTooltip('Mixité bureaux + commerce à confirmer',{sticky:true});l.on('click',handleMapClick);}});
  for(const [id,filename,color] of [['mosPavilion','mos-pavillonnaire','#c6d967'],['mosCollective','mos-collectif','#5c91e6'],['mosActivities','mos-activites','#e2a45c']]){
   groups[id]=L.geoJSON(data[filename],{pane:'data-'+id,style:{color,weight:1,opacity:1,fillColor:color,fillOpacity:.2},onEachFeature:(f,l)=>{l.bindPopup(mosGroupPopup(f));l.bindTooltip(`Mos 2025 · ${f.properties.group_name}`,{sticky:true});l.on('click',handleMapClick);}});
  }
  for(const id of ['transport','equipment','neighborhood','offices'])groups[id]=L.layerGroup();
  allPoints=[...data.transport.features,...data.schools.features,...data.nurseries.features,...data.health.features,...data.neighborhood.features,...data.offices.features];
  for(const f of allPoints){const [x,y]=f.geometry.coordinates;const marker=L.marker([y,x],{pane:'data-'+groupFor(f)+'-markers',icon:featureIcon(f),title:f.properties.kind==='transport'?'':f.properties.name,alt:f.properties.name,keyboard:true,zIndexOffset:f.properties.kind==='office'?900:f.properties.kind==='transport'?1200:0}).bindPopup(popup(f),f.properties.kind==='transport'?{className:'station-card-popup'}:{});if(f.properties.kind==='office')marker.on('click',()=>selectOffice(f));if(f.properties.kind==='transport')marker.on('add',()=>marker.getElement()?.setAttribute('aria-label',f.properties.name));markers.set(f.id,marker);}
  buildControls();buildSources();updateLayers();map.on('zoomend',updateZoneLabels);map.on('click',handleMapClick);$('loading').hidden=true;
  // A read-only diagnostic snapshot used by the browser acceptance checks.
  window.suresnesDiagnostics=()=>({bearing:map.getBearing(),railIds:state.enabled.transport?railLayers.map(r=>r.id):[],roadIds:state.enabled.transport?roadLayers.map(r=>r.id):[],radiusMeters:state.radiusMeters,selected:state.selected,enabled:{...state.enabled},counts:Object.fromEntries(Object.entries(groups).map(([k,g])=>[k,g.getLayers().length])),visible:Object.fromEntries(Object.entries(groups).map(([k,g])=>[k,map.hasLayer(g)])),radius:!!radiusLayer,loadedTiles,failedTiles,pointIds:allPoints.filter(f=>map.hasLayer(groups[groupFor(f)])&&groups[groupFor(f)].hasLayer(markers.get(f.id))).map(f=>f.id)});
 }catch(error){$('loading').innerHTML='<strong>Les données n’ont pas pu être chargées.</strong><p>Vérifiez la connexion puis rechargez la page.</p><button class="button" onclick="location.reload()">Réessayer</button>';console.error('Chargement de la carte',error);}
}
const dialog=$('sources-dialog');for(const id of ['sources-open','sources-inline'])$(id).addEventListener('click',()=>dialog.showModal());$('sources-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
start();
