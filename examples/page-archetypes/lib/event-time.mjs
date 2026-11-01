// HTML global date-times with an explicit UTC offset; reject calendar normalization.
export function isValidEventDateTime(value) {
 if(typeof value!=='string')return false;
 const m=/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
 if(!m || m[0] !== value)return false;
 const [,ys,ms,ds,hs,mins,secs,,zone]=m,year=Number(ys),month=Number(ms),day=Number(ds),hour=Number(hs),minute=Number(mins),second=Number(secs||0);
 const leap=year%4===0&&(year%100!==0||year%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 if(year<1||month<1||month>12||day<1||day>days[month-1]||hour>23||minute>59||second>59)return false;
 return zone === 'Z' || (zone !== '-00:00' && Number(zone.slice(1,3))<=23 && Number(zone.slice(4,6))<=59);
}

// Compare only valid instants; normalize optional HTML syntax to ECMAScript's date-time form.
export function isEventEndBeforeStart(start,end) {
 if(!isValidEventDateTime(start)||!isValidEventDateTime(end))return false;
 const instant=value=>Date.parse(value.replace(' ','T').replace(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?=Z|[+-])/, '$1:00').replace(/\.(\d{1,3})(?=Z|[+-])/,(_,digits)=>`.${digits.padEnd(3,'0')}`));
 return instant(end)<instant(start);
}
