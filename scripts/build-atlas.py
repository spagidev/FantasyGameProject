"""Build the Saltbound Coast from pinned OSM XML. Stdlib only; no network calls."""
import gzip, hashlib, heapq, json, math, sys, xml.etree.ElementTree as E
from pathlib import Path
source = Path(sys.argv[1])
root = E.fromstring(gzip.open(source).read())
nodes = {n.get('id'): [float(n.get('lon')), float(n.get('lat'))] for n in root.findall('node')}
bounds = [7.404, 43.723, 7.448, 43.749]
def project(p):
    return [round((p[0]-bounds[0])/(bounds[2]-bounds[0])*1000, 1), round((bounds[3]-p[1])/(bounds[3]-bounds[1])*810, 1)]
def distance(a,b):
    return math.hypot((a[0]-b[0])*80400, (a[1]-b[1])*111200)
def tags(w): return {t.get('k'):t.get('v') for t in w.findall('tag')}
features=[]; coasts=[]; graph={}
for w in root.findall('way'):
    t=tags(w); refs=[n.get('ref') for n in w.findall('nd') if n.get('ref') in nodes]
    if len(refs)<2: continue
    kind = 'coast' if t.get('natural')=='coastline' else 'grove' if t.get('leisure') in ['park','garden'] or t.get('landuse')=='forest' else 'ruin' if 'building' in t else 'road' if 'highway' in t else None
    if kind and kind!='coast': features.append({'id':w.get('id'),'kind':kind,'points':[project(nodes[r]) for r in refs]})
    if kind=='coast': coasts.append(refs)
    if 'highway' in t and t['highway'] not in ['motorway','motorway_link','construction','proposed'] and t.get('foot')!='no' and t.get('access')!='private':
        for a,b in zip(refs,refs[1:]):
            d=distance(nodes[a], nodes[b]); graph.setdefault(a,{})[b]=d;graph.setdefault(b,{})[a]=d
# Stitch coastline in OSM direction; land is to its left. Closing corners lie outside the view.
while True:
    pair=next(((i,j) for i,a in enumerate(coasts) for j,b in enumerate(coasts) if i!=j and a[-1]==b[0]),None)
    if not pair: break
    i,j=pair;coasts[i]+=coasts[j][1:];coasts.pop(j)
coast=max(coasts,key=len)
land=[project(nodes[r]) for r in coast]+[[1100,-120],[-200,-120],[-200,1100]]
# Retain the largest connected foot-road component so no authored site can become stranded.
unseen=set(graph);components=[]
while unseen:
    todo=[unseen.pop()];comp=set(todo)
    while todo:
        for n in graph[todo.pop()]:
            if n in unseen: unseen.remove(n);comp.add(n);todo.append(n)
    components.append(comp)
component=max(components,key=len)
locations=[
 ('origin',7.4139,43.73136),('watch',7.41789,43.73115),('letters',7.42341,43.73115),
 ('hearth',7.42271,43.73043),('bell1',7.42009,43.73137),('kiln',7.42199,43.73463),
 ('ferry',7.41835,43.73442),('market',7.42046,43.73395),('bell2',7.42083,43.73756),
 ('lens',7.42594,43.73843),('moths',7.42685,43.74037),('garden',7.43091,43.74212),
 ('bell3',7.42855,43.73926),('cache',7.41554,43.72749),('haven',7.41912,43.7268),
 ('spring',7.43049,43.74441),('lookout',7.43575,43.74831),
]
anchors={id:min(component,key=lambda n:distance(nodes[n],[lon,lat])) for id,lon,lat in locations}
points={id:project(nodes[n]) for id,n in anchors.items()}
def route(a,b):
    start,end=anchors[a],anchors[b];q=[(0,start)];cost={start:0};prev={}
    while q:
        d,n=heapq.heappop(q)
        if n==end: break
        if d>cost[n]: continue
        for nxt,dd in graph[n].items():
            nd=d+dd
            if nd<cost.get(nxt,float('inf')): cost[nxt]=nd;prev[nxt]=n;heapq.heappush(q,(nd,nxt))
    assert end in cost, (a,b)
    path=[end]
    while path[-1]!=start:path.append(prev[path[-1]])
    return {'a':a,'b':b,'metres':round(cost[end]),'points':[project(nodes[n]) for n in reversed(path)]}
pairs=list(zip([p[0] for p in locations[:12]],[p[0] for p in locations[1:13]]))
pairs += [('origin','cache'),('cache','haven'),('haven','hearth'),('cache','bell1'),('watch','market'),('market','kiln'),('ferry','watch'),('bell2','ferry'),('bell2','moths'),('lens','bell3'),('bell3','garden'),('garden','spring'),('spring','lookout')]
pack={'version':1,'bounds':bounds,'width':1000,'height':810,'land':land,'features':features,'points':points,'anchors':anchors,'edges':[route(a,b) for a,b in pairs], 'source':{'project':'OpenStreetMap','mirror':'https://github.com/graphhopper/graphhopper/blob/a1f15bac86c14457f31655c822e8ed4f018d2dc7/core/files/monaco.osm.gz','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'snapshot':'2012-06','licence':'ODbL-1.0'}}
out=Path('public/atlas');out.mkdir(parents=True,exist_ok=True)
(out/'saltbound.json').write_text(json.dumps(pack,separators=(',',':'))+'\n')
(out/'source.osm.gz').write_bytes(source.read_bytes())
print(f'{len(features)} features, {len(points)} sites, {len(pairs)} connected roads; {(out/"saltbound.json").stat().st_size} bytes')
