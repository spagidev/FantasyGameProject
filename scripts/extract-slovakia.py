import argparse, json, math, gzip, subprocess
from pathlib import Path
import fiona
from pyproj import Transformer
parser=argparse.ArgumentParser(description='Extract historical Slovak OSM roads from the pinned source repositories. Requires fiona and pyproj.')
parser.add_argument('roads_repository', type=Path)
parser.add_argument('places_repository', type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
places=json.loads((args.places_repository/'GeoJSON/epsg_4326/cities_regions_districts_epsg_4326.geojson').read_text())['features']
groups=[('SK-BL',['Bratislava','Pezinok']),('SK-TA',['Trnava','Piešťany']),('SK-TC',['Trenčín','Prievidza']),('SK-NI',['Nitra','Komárno']),('SK-ZI',['Žilina','Martin']),('SK-BC',['Banská Bystrica','Zvolen']),('SK-PV',['Prešov','Poprad']),('SK-KI',['Košice','Michalovce'])]
to_source=Transformer.from_crs(4326,32634,always_xy=True)
to_wgs=Transformer.from_crs(32634,4326,always_xy=True)
charts=[]
with fiona.open(str(args.roads_repository/'sample_data/sample_data.gdb'),layer='OSM_roads_slovakia') as collection:
 roads=[]
 for r in collection:
  lines=list(r['geometry']['coordinates']); pts=[p for line in lines for p in line]
  if pts: roads.append((min(p[0] for p in pts),min(p[1] for p in pts),max(p[0] for p in pts),max(p[1] for p in pts),dict(r['properties']),lines))
 print('Read',len(roads),'source roads',flush=True)
 for code,names in groups:
  for name in names:
   city=next(p for p in places if p['properties']['name']==name and p['properties']['type'] in ['city','town'])
   lon,lat=city['geometry']['coordinates'];sx=111200*math.cos(math.radians(lat));dx=2050/sx;dy=1700/111200
   corners=[to_source.transform(x,y) for x in [lon-dx,lon+dx] for y in [lat-dy,lat+dy]]
   bbox=(min(p[0] for p in corners),min(p[1] for p in corners),max(p[0] for p in corners),max(p[1] for p in corners))
   elements=[];node_ids={}
   for x0,y0,x1,y1,props,lines in roads:
    if x1<bbox[0] or x0>bbox[2] or y1<bbox[1] or y0>bbox[3]: continue
    osm_id=int(props['osm_id'])
    for part,line in enumerate(lines):
     nodes=[];geom=[]
     for x,y in line:
      # Shared source coordinates preserve the road network's actual junctions.
      key=(round(x,3),round(y,3));node_ids.setdefault(key,len(node_ids)+1);nodes.append(node_ids[key]);xx,yy=to_wgs.transform(x,y);geom.append({'lat':round(yy,7),'lon':round(xx,7)})
     elements.append({'type':'way','id':osm_id,'nodes':nodes,'geometry':geom,'tags':{'highway':props['fclass'],'layer':str(props['layer']),'bridge':props['bridge'],'tunnel':props['tunnel']}})
   charts.append({'id':f'sk-{len(charts)+1:02}', 'region':code,'city':{'type':'node','id':int(city['properties']['osm_id']),'lat':lat,'lon':lon,'tags':{'name':name}},'elements':elements})
   print(name,len(elements),len(node_ids),flush=True)
source={'licence':'ODbL-1.0','roadsRepository':'https://github.com/GISAdamToth/characteristics_of_transport_network_toolbox','roadsRevision':subprocess.check_output(['git','-C',str(args.roads_repository),'rev-parse','HEAD'],text=True).strip(),'roadsLayer':'OSM_roads_slovakia','placeRepository':'https://github.com/drakh/slovakia-gps-data','placeRevision':subprocess.check_output(['git','-C',str(args.places_repository),'rev-parse','HEAD'],text=True).strip(),'retrieved':'2026-11-12','snapshot':'2022 or earlier (roads repository dated 2022-04-28; exact OSM edit date unknown)','charts':charts}
out=root/'public/atlas/slovakia-source.json.gz'
with gzip.GzipFile(str(out),'wb',mtime=0) as f:f.write(json.dumps(source,ensure_ascii=False,separators=(',',':')).encode())
print('Source',out.stat().st_size)
