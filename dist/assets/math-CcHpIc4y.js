/*! All material copyright ESRI, All Rights Reserved, unless otherwise specified.
See https://github.com/Esri/calcite-design-system/blob/dev/LICENSE.md for details.
v3.3.3 */const r=(t,e,a)=>Math.max(e,Math.min(t,a)),n=new RegExp(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/),c=t=>{const e=(""+t).match(n);return!e||parseInt(e[1])===0?0:Math.max(0,(e[1]?e[1].length:0)-(e[2]?+e[2]:0))};function s(t){return c(t)>0&&t>0?parseFloat(`0.${t.toString().split(".")[1]}`):t}export{r as c,c as d,s as g};
