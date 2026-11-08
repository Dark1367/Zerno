const products = {
  'flat-white':['Флэт уайт','Двойной эспрессо и бархатистое молоко.','Эспрессо, молоко'],
  'lavender-raf':['Раф с лавандой','Сливки, ваниль и нежная цветочная нота.','Эспрессо, сливки, лаванда'],
  cheesecake:['Чизкейк без глютена','Нежный десерт к вашему кофе.','Сливочный сыр, сливки, яйца, рисовая мука'],
  espresso:['Эспрессо','Насыщенный кофе с плотной крема.','Кофейное зерно, вода'],
  cappuccino:['Капучино','Эспрессо и молоко с мягкой пеной.','Эспрессо, молоко'],
  croissant:['Круассан','Слоёная выпечка к утреннему кофе.','Пшеничная мука, сливочное масло, молоко']
};
const prices={'flat-white':290,'lavender-raf':340,cheesecake:360,espresso:190,cappuccino:260,croissant:240};
const formatPrice=value=>value.toLocaleString('ru-RU')+' ₽';
const readList=key=>{try{const data=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(data)?data:[];}catch{return [];}};
const saveList=(key,list)=>{try{localStorage.setItem(key,JSON.stringify(list));}catch{}};
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const createEl=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};

/* КР3: параметры напитков — используются в сравнении и в конструкторе */
const drinks={
  espresso:{volume:'40 мл',strength:5,base:'Без молока',taste:'Яркий, плотный, с горчинкой',sizes:[['Стандартный · 40 мл',0],['Двойной · 80 мл',70]],milk:false,extraShot:false},
  'flat-white':{volume:'180 мл',strength:4,base:'Молоко',taste:'Кофейный, бархатистый',sizes:[['Стандартный · 180 мл',0],['Большой · 300 мл',60]],milk:true,extraShot:true},
  cappuccino:{volume:'250 мл',strength:3,base:'Молоко и плотная пена',taste:'Мягкий, сбалансированный',sizes:[['Стандартный · 250 мл',0],['Большой · 350 мл',60]],milk:true,extraShot:true},
  'lavender-raf':{volume:'300 мл',strength:2,base:'Сливки',taste:'Сливочный, сладкий, цветочный',sizes:[['Стандартный · 300 мл',0],['Большой · 400 мл',60]],milk:false,extraShot:true}
};
const milkOptions=[['Обычное',0],['Овсяное',50],['Кокосовое',60],['Безлактозное',40]];
const syrupOptions=[['Без сиропа',0],['Ваниль',30],['Карамель',30],['Лесной орех',30]];
const EXTRA_SHOT_PRICE=60, MAX_QTY=10, MAX_COMPARE=3;

/* Корзина: позиция хранит выбранные опции, цену за штуку и количество */
const normalizeCartItem=item=>{
  if(typeof item==='string')return Object.hasOwn(products,item)?{id:item,options:[],price:prices[item],qty:1}:null;
  if(!item||!Object.hasOwn(products,item.id))return null;
  return {id:item.id,options:Array.isArray(item.options)?item.options.map(String):[],price:Number(item.price)||prices[item.id],qty:Math.min(Math.max(Math.round(Number(item.qty))||1,1),MAX_QTY)};
};
const getCart=()=>readList('zerno-cart').map(normalizeCartItem).filter(Boolean);
const saveCart=cart=>saveList('zerno-cart',cart);
function renderCart(){
  const cart=getCart();
  document.querySelectorAll('.cart-count').forEach(el=>el.textContent=cart.reduce((sum,item)=>sum+item.qty,0));
  const box=document.querySelector('#cartItems');if(!box)return;box.replaceChildren();
  if(!cart.length){box.textContent='Пока здесь пусто.';return;}
  cart.forEach((item,index)=>{
    const row=createEl('div','receipt-line');
    const name=createEl('span','cart-item-name',products[item.id][0]+(item.qty>1?' × '+item.qty:''));
    if(item.options.length)name.append(createEl('small','cart-item-options',item.options.join(', ')));
    const remove=createEl('button','btn btn-sm btn-outline-dark','Удалить');
    remove.type='button';remove.setAttribute('aria-label','Удалить '+products[item.id][0]+' из корзины');
    remove.addEventListener('click',()=>{const next=getCart();next.splice(index,1);saveCart(next);renderCart();});
    row.append(name,createEl('span','dots'),createEl('strong','text-nowrap',formatPrice(item.price*item.qty)),remove);
    box.append(row);
  });
  const total=createEl('div','receipt-line cart-total');
  total.append(createEl('span','','Итого'),createEl('span','dots'),createEl('strong','',formatPrice(cart.reduce((sum,item)=>sum+item.price*item.qty,0))));
  box.append(total);
}

/* Избранное */
const getFavorites=()=>readList('zerno-favorites').filter(id=>Object.hasOwn(products,id));
function toggleFavorite(id){
  const list=getFavorites();const index=list.indexOf(id);
  if(index===-1)list.push(id);else list.splice(index,1);
  saveList('zerno-favorites',list);renderFavorites();
  if(menuState.favoritesOnly)applyMenuFilters();
}
function renderFavorites(){
  const list=getFavorites();
  document.querySelectorAll('.favorites-count').forEach(el=>el.textContent=list.length);
  document.querySelectorAll('[data-favorite]').forEach(button=>{
    const id=button.dataset.favorite,active=list.includes(id),name=products[id][0];
    button.setAttribute('aria-pressed',String(active));button.classList.toggle('is-active',active);
    button.setAttribute('aria-label',(active?'Убрать из избранного: ':'Добавить в избранное: ')+name);
    button.textContent=button.dataset.favoriteStyle==='full'?(active?'♥ В избранном':'♡ В избранное'):(active?'♥':'♡');
  });
}

/* Сравнение напитков (только кофе, до трёх позиций) */
const compareBox=document.querySelector('#compareTable');
const getCompare=()=>readList('zerno-compare').filter(id=>Object.hasOwn(drinks,id)).slice(0,MAX_COMPARE);
function toggleCompare(id){
  const list=getCompare();const index=list.indexOf(id);
  if(index!==-1)list.splice(index,1);else if(list.length<MAX_COMPARE)list.push(id);
  saveList('zerno-compare',list);renderCompare();
}
function renderCompare(){
  if(!compareBox)return;
  const list=getCompare();
  document.querySelector('#compareCount').textContent=list.length;
  const openButton=document.querySelector('#compareOpen');
  openButton.disabled=list.length<2;openButton.title=list.length<2?'Отметьте минимум два напитка':'';
  document.querySelectorAll('[data-compare]').forEach(button=>{
    const active=list.includes(button.dataset.compare);
    button.setAttribute('aria-pressed',String(active));button.classList.toggle('is-active',active);
    button.textContent=active?'✓ В сравнении':'+ Сравнить';
    button.disabled=!active&&list.length>=MAX_COMPARE;
    button.title=button.disabled?'Сравнить можно не больше трёх напитков':'';
  });
  compareBox.replaceChildren();
  if(list.length<2){compareBox.append(createEl('p','mb-0','Отметьте в меню хотя бы два напитка, чтобы сравнить их.'));return;}
  const minPrice=Math.min(...list.map(id=>prices[id])),maxStrength=Math.max(...list.map(id=>drinks[id].strength));
  const rows=[
    ['Цена',id=>formatPrice(prices[id]),id=>prices[id]===minPrice?'дешевле всех':''],
    ['Объём',id=>drinks[id].volume],
    ['Крепость',id=>'●'.repeat(drinks[id].strength)+'○'.repeat(5-drinks[id].strength),id=>drinks[id].strength===maxStrength?'самый крепкий':''],
    ['Основа',id=>drinks[id].base],
    ['Вкус',id=>drinks[id].taste],
    ['Состав',id=>products[id][2]]
  ];
  const wrap=createEl('div','table-responsive'),table=createEl('table','table compare-table align-middle');
  const headRow=createEl('tr');headRow.append(createEl('td'));
  list.forEach(id=>{
    const th=createEl('th');th.scope='col';
    const remove=createEl('button','btn btn-sm btn-link compare-remove','Убрать');
    remove.type='button';remove.setAttribute('aria-label','Убрать из сравнения: '+products[id][0]);
    remove.addEventListener('click',()=>toggleCompare(id));
    th.append(createEl('span','compare-name',products[id][0]),remove);headRow.append(th);
  });
  const thead=createEl('thead');thead.append(headRow);
  const tbody=createEl('tbody');
  rows.forEach(([label,value,badge])=>{
    const tr=createEl('tr'),th=createEl('th','',label);th.scope='row';tr.append(th);
    list.forEach(id=>{
      const td=createEl('td','',value(id)),note=badge?badge(id):'';
      if(label==='Крепость')td.setAttribute('aria-label','Крепость '+drinks[id].strength+' из 5');
      if(note){td.classList.add('compare-best');td.append(createEl('span','compare-badge',note));}
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(thead,tbody);wrap.append(table);compareBox.append(wrap);
}

/* Карточки меню: кнопки «избранное» и «сравнить» */
const menuItems=[...document.querySelectorAll('.menu-item')];
menuItems.forEach(item=>{
  const link=item.querySelector('a[href*="item="]');
  const id=link?new URL(link.href).searchParams.get('item'):null;
  if(!Object.hasOwn(products,id))return;
  item.dataset.id=id;
  const card=item.querySelector('.paper-card');
  const favorite=createEl('button','favorite-toggle');favorite.type='button';favorite.dataset.favorite=id;
  favorite.addEventListener('click',()=>toggleFavorite(id));card.prepend(favorite);
  if(compareBox&&Object.hasOwn(drinks,id)){
    const compare=createEl('button','btn btn-sm compare-toggle');compare.type='button';compare.dataset.compare=id;
    compare.addEventListener('click',()=>toggleCompare(id));
    card.querySelector('.small-copy').after(compare);
  }
});

/* Поиск + фильтры + «только избранное» */
const menuState={category:'Все',query:'',favoritesOnly:false};
const normalizeText=text=>text.toLowerCase().replace(/ё/g,'е');
const menuToolbar=document.querySelector('#menuToolbar'),toolbarSentinel=document.querySelector('.menu-toolbar-sentinel');
const searchInput=document.querySelector('#menuSearch'),favoritesOnlyButton=document.querySelector('#favoritesOnly');
function applyMenuFilters(){
  if(!menuItems.length)return;
  const favorites=getFavorites(),words=normalizeText(menuState.query).split(/\s+/).filter(Boolean);
  let shown=0;
  menuItems.forEach(item=>{
    const id=item.dataset.id,text=normalizeText((id?products[id].join(' '):item.textContent)+' '+(item.dataset.category||''));
    const visible=(menuState.category==='Все'||item.dataset.category===menuState.category)&&words.every(word=>text.includes(word))&&(!menuState.favoritesOnly||favorites.includes(id));
    item.hidden=!visible;if(visible)shown++;
  });
  const status=document.querySelector('#menuStatus');
  if(status)status.textContent=shown===menuItems.length?'В меню '+shown+' позиций':'Найдено: '+shown+' из '+menuItems.length;
  const empty=document.querySelector('#menuEmpty');
  if(empty){
    empty.hidden=shown>0;
    empty.querySelector('p').textContent=menuState.favoritesOnly&&!favorites.length?'В избранном пока пусто. Нажмите ♡ на карточке, чтобы сохранить позицию.':'Попробуйте другое слово или сбросьте фильтры.';
  }
}
function scrollToMenuStart(){
  if(menuToolbar&&menuToolbar.classList.contains('is-stuck'))toolbarSentinel.scrollIntoView({behavior:reduceMotion()?'auto':'smooth'});
}
function setCategory(category){
  menuState.category=category;
  document.querySelectorAll('.filter').forEach(button=>{
    const active=button.dataset.filter===category;
    button.classList.toggle('btn-dark',active);button.classList.toggle('btn-outline-dark',!active);
    button.setAttribute('aria-pressed',String(active));
  });
  applyMenuFilters();
}
function setFavoritesOnly(value){
  menuState.favoritesOnly=value;
  if(favoritesOnlyButton){
    favoritesOnlyButton.setAttribute('aria-pressed',String(value));
    favoritesOnlyButton.classList.toggle('btn-dark',value);favoritesOnlyButton.classList.toggle('btn-outline-dark',!value);
  }
  applyMenuFilters();
}
document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{setCategory(button.dataset.filter);scrollToMenuStart();}));
if(searchInput){
  searchInput.addEventListener('input',()=>{menuState.query=searchInput.value;applyMenuFilters();});
  searchInput.addEventListener('keydown',event=>{if(event.key==='Escape'){searchInput.value='';menuState.query='';applyMenuFilters();}});
}
if(favoritesOnlyButton)favoritesOnlyButton.addEventListener('click',()=>{setFavoritesOnly(!menuState.favoritesOnly);scrollToMenuStart();});
const menuReset=document.querySelector('#menuReset');
if(menuReset)menuReset.addEventListener('click',()=>{if(searchInput)searchInput.value='';menuState.query='';menuState.favoritesOnly=false;setFavoritesOnly(false);setCategory('Все');if(searchInput)searchInput.focus();});
const compareClear=document.querySelector('#compareClear');
if(compareClear)compareClear.addEventListener('click',()=>{saveList('zerno-compare',[]);renderCompare();});
/* Sticky-панель: тень появляется, когда панель «прилипла» к верху экрана */
if(menuToolbar&&toolbarSentinel&&'IntersectionObserver' in window){
  new IntersectionObserver(([entry])=>menuToolbar.classList.toggle('is-stuck',!entry.isIntersecting&&entry.boundingClientRect.top<0)).observe(toolbarSentinel);
}

/* Страница позиции + конструктор напитка с расчётом цены */
const product=document.querySelector('#product');
if(product){
  const id=new URLSearchParams(location.search).get('item');const p=Object.hasOwn(products,id)?products[id]:null;
  if(!p){product.innerHTML='<div class="alert alert-warning">Позиция не найдена. Выберите напиток или десерт в меню.</div>';}
  else{
    const d=Object.hasOwn(drinks,id)?drinks[id]:null;
    const radios=(name,options)=>options.map(([label,extra],i)=>`<input class="btn-check" type="radio" name="${name}" id="${name}${i}" value="${i}"${i?'':' checked'}><label class="btn btn-outline-dark" for="${name}${i}">${label}${extra?` <span class="option-price">+${extra} ₽</span>`:''}</label>`).join('');
    const group=(title,name,options)=>`<fieldset class="builder-group"><legend>${title}</legend><div class="builder-options">${radios(name,options)}</div></fieldset>`;
    const builderOptions=d?`<h2 class="h5 builder-title">Соберите свой напиток</h2>${group('Размер','size',d.sizes)}${d.milk?group('Молоко','milk',milkOptions):''}${group('Сироп','syrup',syrupOptions)}${d.extraShot?`<div class="form-check builder-check"><input class="form-check-input" type="checkbox" id="extraShot" name="extraShot"><label class="form-check-label" for="extraShot">Дополнительный шот эспрессо <span class="option-price">+${EXTRA_SHOT_PRICE} ₽</span></label></div>`:''}`:'';
    product.innerHTML=`<div class="row g-5"><div class="col-md-6"><div class="placeholder-art photo-${id} product-photo" style="height:360px" role="img" aria-label="${p[0]}"></div></div><div class="col-md-6"><span class="eyebrow">Меню / ЗЕРНО</span><h1 class="mt-3">${p[0]}</h1><p>${p[1]}</p><p><strong>${d?'от ':''}${formatPrice(prices[id])}</strong></p><form class="drink-builder" id="builder" novalidate>${builderOptions}<div class="builder-qty"><span class="builder-label" id="qtyLabel">Количество</span><div class="qty-stepper" role="group" aria-labelledby="qtyLabel"><button type="button" data-step="-1" aria-label="Уменьшить количество">−</button><input type="number" id="qty" name="qty" min="1" max="${MAX_QTY}" value="1" inputmode="numeric" aria-label="Количество"><button type="button" data-step="1" aria-label="Увеличить количество">+</button></div></div><div class="receipt builder-receipt"><div id="builderLines"></div><div class="receipt-line receipt-total"><span>Итого</span><span class="dots"></span><strong id="builderTotal" aria-live="polite"></strong></div></div><div class="d-flex flex-wrap gap-2"><button class="btn btn-dark" type="submit" id="addCart">Добавить в корзину ↗</button><button class="btn btn-outline-dark" type="button" data-favorite="${id}" data-favorite-style="full"></button></div></form><div class="alert alert-success mt-3 d-none" id="added" role="status">Добавлено в корзину.</div><div class="accordion mt-4" id="details"><div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button" data-bs-toggle="collapse" data-bs-target="#composition" aria-expanded="true" aria-controls="composition">Состав</button></h2><div id="composition" class="accordion-collapse collapse show" data-bs-parent="#details"><div class="accordion-body">${p[2]}. Уточните состав и аллергены у бариста.</div></div></div><div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#nutrition" aria-expanded="false" aria-controls="nutrition">Пищевая ценность</button></h2><div id="nutrition" class="accordion-collapse collapse" data-bs-parent="#details"><div class="accordion-body">Пищевая ценность зависит от размера и состава. Уточните у бариста.</div></div></div></div></div></div>`;
    const form=document.querySelector('#builder'),qtyInput=form.elements.namedItem('qty');
    const clampQty=value=>Math.min(Math.max(Math.round(Number(value))||1,1),MAX_QTY);
    function readBuilder(){
      const lines=[[p[0],prices[id]]],options=[];
      if(d){
        const size=d.sizes[Number(form.elements.namedItem('size').value)];options.push(size[0]);
        if(size[1])lines.push([size[0].split(' · ')[0]+' размер',size[1]]);
        if(d.milk){const milk=milkOptions[Number(form.elements.namedItem('milk').value)];if(milk[1]){lines.push(['Молоко: '+milk[0].toLowerCase(),milk[1]]);options.push(milk[0]+' молоко');}}
        const syrup=syrupOptions[Number(form.elements.namedItem('syrup').value)];if(syrup[1]){lines.push(['Сироп: '+syrup[0].toLowerCase(),syrup[1]]);options.push('сироп '+syrup[0].toLowerCase());}
        const shot=form.elements.namedItem('extraShot');if(shot&&shot.checked){lines.push(['Доп. шот эспрессо',EXTRA_SHOT_PRICE]);options.push('доп. шот');}
      }
      const unit=lines.reduce((sum,line)=>sum+line[1],0);
      return {lines,options,unit,qty:clampQty(qtyInput.value)};
    }
    function renderBuilder(){
      const {lines,unit,qty}=readBuilder(),box=document.querySelector('#builderLines');box.replaceChildren();
      lines.forEach(([label,amount],i)=>{const row=createEl('div','receipt-line');row.append(createEl('span','',label),createEl('span','dots'),createEl('span','text-nowrap',(i?'+':'')+formatPrice(amount)));box.append(row);});
      if(qty>1){const row=createEl('div','receipt-line');row.append(createEl('span','','Количество'),createEl('span','dots'),createEl('span','',formatPrice(unit)+' × '+qty));box.append(row);}
      document.querySelector('#builderTotal').textContent=formatPrice(unit*qty);
    }
    form.addEventListener('change',renderBuilder);
    qtyInput.addEventListener('input',renderBuilder);
    qtyInput.addEventListener('blur',()=>{qtyInput.value=clampQty(qtyInput.value);renderBuilder();});
    form.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>{qtyInput.value=clampQty(Number(qtyInput.value)+Number(button.dataset.step));renderBuilder();}));
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const {options,unit,qty}=readBuilder(),cart=getCart();
      const same=cart.find(item=>item.id===id&&item.price===unit&&item.options.join('|')===options.join('|'));
      if(same)same.qty=Math.min(same.qty+qty,MAX_QTY);else cart.push({id,options,price:unit,qty});
      saveCart(cart);renderCart();
      const added=document.querySelector('#added');added.textContent='Добавлено в корзину: '+p[0]+(qty>1?' × '+qty:'')+'.';added.classList.remove('d-none');
    });
    product.querySelector('[data-favorite]').addEventListener('click',()=>toggleFavorite(id));
    renderBuilder();
  }
}
renderCart();renderFavorites();renderCompare();applyMenuFilters();
document.querySelectorAll('.demo-form').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();if(form.reportValidity())form.querySelector('.form-result').innerHTML='<div class="alert alert-success" role="status">Сейчас отправка через сайт недоступна. Пожалуйста, свяжитесь с нами по телефону или электронной почте.</div>';}));

const topButton=document.querySelector('.back-to-top');
function updateTopButton(){topButton.hidden=document.documentElement.scrollHeight<=innerHeight+10;topButton.classList.toggle('is-scrolled',scrollY>200);}
if(topButton){updateTopButton();addEventListener('scroll',updateTopButton,{passive:true});addEventListener('resize',updateTopButton);topButton.addEventListener('click',()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));}
const reviewForm=document.querySelector('#reviewForm');
if(reviewForm){
 const list=document.querySelector('#reviewsList'), count=document.querySelector('#reviewCount'), status=document.querySelector('#reviewStatus');
 const loadReviews=()=>{try{const data=JSON.parse(localStorage.getItem('zerno-reviews')||'[]');return Array.isArray(data)?data:[];}catch{return [];}};
 function renderReviews(){const reviews=loadReviews();list.replaceChildren();count.textContent=reviews.length?'Всего: '+reviews.length:'';if(!reviews.length){const empty=document.createElement('div');empty.className='feature-box';const title=document.createElement('h3');title.textContent='Здесь пока тихо';const text=document.createElement('p');text.className='mb-0';text.textContent='Ваш отзыв может стать первым в этом браузере.';empty.append(title,text);list.append(empty);return;}reviews.slice().reverse().forEach(review=>{const card=document.createElement('article');card.className='feature-box mb-3';const header=document.createElement('div');header.className='d-flex justify-content-between align-items-center gap-3';const name=document.createElement('h3');name.className='h5 mb-0';name.textContent=review.name;const rating=document.createElement('span');rating.className='review-stars';rating.setAttribute('aria-label','Оценка: '+review.rating+' из 5');rating.textContent='★'.repeat(review.rating)+'☆'.repeat(5-review.rating);const text=document.createElement('p');text.className='mt-3 mb-0';text.textContent=review.text;header.append(name,rating);card.append(header,text);list.append(card);});}
 reviewForm.addEventListener('submit',event=>{event.preventDefault();if(!reviewForm.reportValidity())return;const name=reviewForm.elements.namedItem("name").value.trim(),text=reviewForm.elements.namedItem("review").value.trim(),rating=Number(reviewForm.elements.namedItem("rating").value);if(!name||!text||rating<1||rating>5){status.textContent='Заполните все поля.';return;}try{const reviews=loadReviews();reviews.push({name,text,rating});localStorage.setItem('zerno-reviews',JSON.stringify(reviews));reviewForm.reset();status.textContent='Отзыв сохранён в этом браузере.';renderReviews();}catch{status.textContent='Не удалось сохранить отзыв в браузере.';}});
 renderReviews();
}
