import {currentUser,authError} from './auth.js?v=1.4.0';
import {getProfile,playerNode,refreshProfile} from './profile.js?v=1.4.0';
import {loadCatalog,getCatalog,acquireItem,equipItem,requirementMet,coinNode} from './economy.js?v=1.4.0';
import {VERSION} from './config.js?v=1.4.0';
export class Shop{
 constructor(onBack){this.type='marco';this.onBack=onBack;this.$=id=>document.getElementById(id);this.$('shop-back').onclick=onBack;for(const b of this.$('shop-tabs').children)b.onclick=()=>{this.type=b.dataset.type;this.render();};}
 async open(){await loadCatalog();this.$('shop-status').textContent='';this.render();}
 render(){const $=this.$,p=getProfile()||{},user=currentUser();$('shop-balance').replaceChildren(coinNode(p.monedas));$('shop-preview').replaceChildren(playerNode(p,false));for(const b of $('shop-tabs').children)b.classList.toggle('active',b.dataset.type===this.type);
 $('shop-items').replaceChildren(...getCatalog().filter(item=>item.tipo===this.type).map(item=>{const card=document.createElement('article');card.className=`shop-item rarity-${item.rareza}`;card.dataset.item=item.id;
  const preview=document.createElement('div');preview.className='item-preview';if(item.tipo==='marco')preview.append(playerNode({...p,equipado:{...p.equipado,marco:item.id}},false));else if(item.tipo==='fondo'){const image=document.createElement('img');image.alt='';image.src=`${item.archivo}?v=${VERSION}`;image.onerror=()=>{image.onerror=null;image.src=image.src.replace('.webp','.png');};preview.append(image,playerNode(p));}else{const text=document.createElement('span');text.className='cosmetic-title';text.textContent=item.nombre;preview.append(text);}
  const name=document.createElement('h2');name.textContent=item.nombre;const rarity=document.createElement('span');rarity.textContent={comun:'Común',raro:'Raro',epico:'Épico',legendario:'Legendario'}[item.rareza];const action=document.createElement('button'),owned=p.inventario?.[item.id]===true,equipped=p.equipado?.[item.tipo]===item.id;
  if(owned){action.textContent=equipped?'DESEQUIPAR':'EQUIPAR';}else if(item.requisito){const desc=document.createElement('p');desc.textContent=item.requisito.tipo==='nivel'?`Nivel ${item.requisito.valor}`:item.requisito.valor==='pesadilla10'?'10 pasillos en Pesadilla':'Bestiario completo';card.append(desc);action.textContent='DESBLOQUEAR';action.disabled=!user||!requirementMet(item,p);}else{card.append(coinNode(item.precio,'Precio'));action.textContent='COMPRAR';action.disabled=!user;}
  action.onclick=async()=>{action.disabled=true;$('shop-status').textContent='';try{if(owned)await equipItem(equipped?'':item.id,item.tipo);else await acquireItem(item.id);await refreshProfile();document.dispatchEvent(new CustomEvent('pasillo-identity'));this.render();}catch(e){$('shop-status').textContent=authError(e);action.disabled=false;}};card.append(preview,name,rarity,action);return card;}));
 }
}
