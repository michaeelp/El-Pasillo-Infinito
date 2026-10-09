import { setPortrait } from './monsters.js?v=1.1.0';
export class Book {
  constructor(monsters,audio){this.monsters=monsters;this.audio=audio;this.index=0;this.turnTimer=0;
    this.root=document.getElementById('book');this.marks=document.getElementById('bookmarks');
    monsters.forEach((m,i)=>{const b=document.createElement('button'),img=document.createElement('img'),n=document.createElement('span');b.setAttribute('aria-label',m.nombre);b.title=m.nombre;setPortrait(img,m);n.textContent=String(m.id).padStart(2,'0');b.append(img,n);b.onclick=()=>this.go(i);this.marks.append(b);});
    document.getElementById('prev-page').onclick=()=>this.go(this.index-1);document.getElementById('next-page').onclick=()=>this.go(this.index+1);this.render();
  }
  go(index,animate=true){if(this.turnTimer)return;this.index=(index+this.monsters.length)%this.monsters.length;
    if(animate){this.audio.effect('page');this.root.classList.add('turning');this.render();this.turnTimer=setTimeout(()=>{this.root.classList.remove('turning');this.turnTimer=0;},430);}else this.render();
  }
  render(){const m=this.monsters[this.index];setPortrait(document.getElementById('book-portrait'),m);
    for(const[id,value]of Object.entries({'book-name':m.nombre,'page-number':String(this.index+1),'page-count':`${this.index+1} / ${this.monsters.length}`}))document.getElementById(id).textContent=value;
    const ul=document.getElementById('weaknesses');ul.replaceChildren();m.debilidades.forEach(w=>{const li=document.createElement('li');li.textContent=w.es;ul.append(li);});
    [...this.marks.children].forEach((b,i)=>b.setAttribute('aria-current',String(i===this.index)));
  }
}
