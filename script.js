// Profils
const profiles = [
  "Tank 1","Tank 2","Heal 1","Heal 2","Heal 3",
  "DPS 1","DPS 2","DPS 3","DPS 4","DPS 5"
];

// Catégories et items
const categories = {
  "Companions Stats":[
    "Scorpion","Portobello","Tutor","Etrien","Flap Jack","Minsc","Blue Fire Eye"
  ],
  "Companions buff/debuff":[
    "Spined Devil","Blaspheme Assassin","Lysaera"
  ],
  "Supp Mounts Active Powers":[
    "Cauldron","Red Dragon","Brain Stealer Dragon","Dragon Chicken","Rex"
  ],
  "Supp Mount Passive Powers":[
    "Mystic Aura","Runic Aura","Pack Tactic","Avian Aura"
  ],  
  "Set":[
    "Vistani","Apocalypse","Marilith","Netherese"
  ],
  "Ring":[
    "Elistrae's Grace"
  ],
  "Supp Enchant Powers":[
    "Armor break Tank","Slowed reactions","Vulnerability","Dulled Senses"
  ],
  "Artis":[
    "Mythalar","Demo","Spelljammer","Crystal","Censor","Xeleth","Volcano","Marco","Lantern","Black Dragon","Marilith"
  ]
};

// Catégories
function getCategoriesForProfile(profileName){
  if(profileName.startsWith("DPS")){
    return ["Companions Stats","Companions buff/debuff","Artis"];
  }
  return Object.keys(categories);
}

const container = document.querySelector(".profiles-grid");

// Génération profils
profiles.forEach(profileName => {
  const div = document.createElement("div");
  div.className = "profile";

  // Ajout classe rôle pour couleur
  if(profileName.startsWith("Tank")) div.classList.add("tank");
  else if(profileName.startsWith("Heal")) div.classList.add("heal");
  else if(profileName.startsWith("DPS")) div.classList.add("dps");

  const title = document.createElement("h3");
  title.textContent = profileName;
  div.appendChild(title);

  const cats = getCategoriesForProfile(profileName);

  cats.forEach(cat => {
    const catDiv = document.createElement("div");
    catDiv.className = "category";

    const h4 = document.createElement("h4");
    h4.textContent = cat;
    catDiv.appendChild(h4);

    categories[cat].forEach(item => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.profile = profileName;
      checkbox.dataset.item = item;

      checkbox.addEventListener("change", updateOverview);

      label.appendChild(checkbox);
      label.append(" " + item);
      catDiv.appendChild(label);
    });

    div.appendChild(catDiv);
  });

  container.appendChild(div);
});

// --- Overview global ---
function updateOverview(){
  const checked = document.querySelectorAll(".profiles-grid input[type=checkbox]:checked");

  const categoryMap = {};
  Object.keys(categories).forEach(cat => {
    categoryMap[cat] = {};
    categories[cat].forEach(item => {
      categoryMap[cat][item] = { count: 0, profiles: [] };
    });
  });

  checked.forEach(cb => {
    const item = cb.dataset.item;
    const profile = cb.dataset.profile;
    for(const [cat, items] of Object.entries(categoryMap)){
      if(items.hasOwnProperty(item)){
        items[item].count++;
        items[item].profiles.push(profile);
        break;
      }
    }
  });

  const overviewDiv = document.getElementById("overview-categories");
  overviewDiv.innerHTML = "";

  for(const [cat, items] of Object.entries(categoryMap)){
    const catDiv = document.createElement("div");
    catDiv.className = "overview-category";

    const h3 = document.createElement("h3");
    h3.textContent = cat;
    catDiv.appendChild(h3);

    for(const [item, data] of Object.entries(items)){
      const line = document.createElement("div");
      line.className = "item-line";

      const name = document.createElement("span");
      name.textContent = item;

      const badge = document.createElement("span");
      badge.className = "item-badge";
      badge.textContent = data.count;

      line.appendChild(name);
      line.appendChild(badge);

      // jetons profils
      data.profiles.forEach(p => {
        const profBadge = document.createElement("span");
        profBadge.className = "profile-tag " + getRoleClass(p);
        profBadge.textContent = formatProfileShort(p);
        line.appendChild(profBadge);
      });

      catDiv.appendChild(line);
    }

    overviewDiv.appendChild(catDiv);
  }
}

// Helper
function formatProfileShort(profile){
  if(profile.startsWith("Tank")) return "T" + profile.split(" ")[1];
  if(profile.startsWith("Heal")) return "H" + profile.split(" ")[1];
  if(profile.startsWith("DPS"))  return "D" + profile.split(" ")[1];
  return profile;
}
function getRoleClass(profile){
  if(profile.startsWith("Tank")) return "tank";
  if(profile.startsWith("Heal")) return "heal";
  if(profile.startsWith("DPS")) return "dps";
  return "";
}

// Initial overview
updateOverview();

// Slide panel
const slidePanel = document.getElementById("slidePanel");
document.getElementById("openPanel").onclick = () => slidePanel.classList.add("open");
document.getElementById("closePanel").onclick = () => slidePanel.classList.remove("open");
