"""Give each place a neighbourhood (field h) from its coordinates. Far-away places go to 그 밖의 지역."""
import json,math,collections,sys
SRC,OUT=sys.argv[1],sys.argv[2]
H=[("시부야",35.6598,139.7010),("하라주쿠·오모테산도",35.6690,139.7080),("에비스·나카메구로",35.6460,139.7020),
("신주쿠",35.6915,139.7025),("긴자·유라쿠초",35.6717,139.7640),("니혼바시·도쿄역",35.6830,139.7725),("츠키지",35.6655,139.7705),
("아사쿠사",35.7120,139.7960),("우에노",35.7110,139.7760),("아키하바라",35.6984,139.7731),("도요스·오다이바",35.6500,139.7900),
("롯폰기·아자부",35.6600,139.7300),("시모키타자와",35.6615,139.6680),("기치조지",35.7030,139.5797)]
def d(p,h): return math.hypot((p['lat']-h[1])*111,(p['lng']-h[2])*90.6)
P=json.load(open(SRC)); c=collections.Counter()
for p in P:
    h=min(H,key=lambda h:d(p,h))
    p['h']=h[0] if d(p,h)<=2.2 else "그 밖의 지역"; c[p['h']]+=1
json.dump(P,open(OUT,'w'),ensure_ascii=False,separators=(',',':'))
print(c.most_common()); print([p['n'] for p in P if p['h']=="그 밖의 지역"])
