// Configuration
const COLUMNS = ['Class','Character name','Companions','Artefacts','Mounts','Auras','Sets','Gear'];

// Icônes pour les catégories
const CATEGORY_ICONS = {
  'Character name': 'fa-user',
  'Companions': 'fa-dragon',
  'Artefacts': 'fa-gem',
  'Mounts': 'fa-horse',
  'Auras': 'fa-magic',
  'Sets': 'fa-layer-group',
  'Gear': 'fa-shield'
};

let roleCounters = { Tank: 0, Heal: 0, DPS: 0 };
let overviewData = {};
let selectedItemsCount = 0;
let formData = [];

// Fonction pour normaliser le rôle (problème de casse)
function normalizeRole(role) {
  if (!role || role.trim() === '') return null; // Retourne null si le rôle est vide
  
  const roleLower = role.toLowerCase().trim();
  if (roleLower === 'tank') return 'Tank';
  if (roleLower === 'heal') return 'Heal';
  if (roleLower === 'dps') return 'DPS';
  
  // rôle n'est pas reconnu, on retourne null
  return null;
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
  // Configurer les écouteurs d'événements
  document.getElementById('openPanel').onclick = () => document.getElementById('slidePanel').classList.add('open');
  document.getElementById('closePanel').onclick = () => document.getElementById('slidePanel').classList.remove('open');
  document.getElementById('fetch-data').addEventListener('click', fetchData);
  document.getElementById('fetch-data-btn').addEventListener('click', fetchData);
  document.getElementById('roleFilter').addEventListener('change', filterCards);
  document.getElementById('sortOption').addEventListener('change', sortCards);
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('resetBtn').addEventListener('click', resetSelections);
});

function fetchData() {
  const sheetId = document.getElementById('sheet-id').value;
  
  if (!sheetId) {
    setStatus('Please enter a google sheet ID', 'error');
    return;
  }
  
  setStatus('loading data...', 'loading');
  
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  const url = base;
  
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('network error: ' + response.status);
      }
      return response.text();
    })
    .then(text => {
      const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/s);
      if (!match || !match[1]) {
        throw new Error('Unexpected response format');
      }
      
      const json = JSON.parse(match[1]);
      const cols = (json.table.cols || []).map(c => (c.label || '').trim());

      const cardsContainer = document.getElementById('profiles-grid');
      cardsContainer.innerHTML = '';
      
      // Réinitialiser les compteurs
      roleCounters = { Tank: 0, Heal: 0, DPS: 0 };
      formData = [];
      
      let hasValidData = false;
      let validMembersCount = 0;
      
      (json.table.rows || []).forEach(r => {
        if (!r || !r.c) return;
        
        const rowData = {};
        let isEmptyRow = true;
        
        cols.forEach((c, i) => {
          rowData[c] = r.c[i] ? r.c[i].v : '';
          if (rowData[c] && rowData[c].toString().trim() !== '') {
            isEmptyRow = false;
          }
        });
        
        // Ignorer les lignes vides
        if (isEmptyRow) return;
        
        hasValidData = true;
        formData.push(rowData);
        
        // Normaliser le rôle pour gérer la casse
        const rawRole = rowData['Class'] || '';
        const role = normalizeRole(rawRole);
        
        // Si le rôle n'est pas reconnu, on ignore cette ligne
        if (!role) return;
        
        validMembersCount++;
        const card = createCard(role, rowData);
        cardsContainer.appendChild(card);
      });

      // Afficher un message si aucune donnée valide n'a été trouvée
      if (!hasValidData) {
        cardsContainer.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-exclamation-circle"></i>
            <h3>no valid data</h3>
            <p>The Google Sheets sheet does not contain any valid data or the roles are not recognized.</p>
          </div>
        `;
        setStatus('No valid data found in the sheet', 'error');
      } else if (validMembersCount === 0) {
        cardsContainer.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-exclamation-circle"></i>
            <h3>No valid members</h3>
            <p>The sheet contains data but no member with a valid role (Tank, Heal, DPS).</p>
          </div>
        `;
        setStatus('No valid members found in the sheet', 'error');
      } else {
        updateSummary();
        setStatus(`Data loaded successfully - ${validMembersCount} valid member(s)`, 'success');
      }
    })
    .catch(err => {
      console.error(err);
      setStatus('Erreur: ' + err.message, 'error');
      document.getElementById('profiles-grid').innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Error loading</h3>
          <p>Unable to load data from google sheets. Check sheet ID.</p>
        </div>
      `;
    });
}

function createCard(role, data) {
  roleCounters[role] = (roleCounters[role] || 0) + 1;
  const roleIndex = roleCounters[role];
  
  const card = document.createElement('div');
  card.className = `profile ${role.toLowerCase()}`;
  card.dataset.role = role;

  // Créer le titre avec le nom du personnage si disponible
  const title = document.createElement('h3');
  const characterName = data['Character name'] || '';
  
  if (characterName && characterName.trim() !== '') {
    title.textContent = `${characterName} (${role} ${roleIndex})`;
    card.dataset.nickname = characterName;
  } else {
    title.textContent = `${role} ${roleIndex}`;
  }
  
  card.appendChild(title);

  COLUMNS.forEach(col => {
    if (col === 'Class' || col === 'Character name') return;
    
    if (data[col] && data[col].toString().trim() !== '') {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'category';
      
      const categoryTitle = document.createElement('h4');
      
      const icon = document.createElement('i');
      icon.className = `fas ${CATEGORY_ICONS[col] || 'fa-circle'}`;
      categoryTitle.appendChild(icon);
      categoryTitle.appendChild(document.createTextNode(` ${col}`));
      
      categoryDiv.appendChild(categoryTitle);

      const items = data[col].toString().split(',').map(x => x.trim()).filter(Boolean);
      items.forEach(item => {
        const label = document.createElement('label');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.profile = `${role} ${roleIndex}`;
        checkbox.dataset.item = item;
        checkbox.dataset.category = col;
        
        checkbox.addEventListener('change', () => {
          updateOverview(item, col, `${role} ${roleIndex}`, checkbox.checked);
          updateSelectedCount(checkbox.checked);
        });
        
        label.appendChild(checkbox);
        label.append(' ' + item);
        categoryDiv.appendChild(label);
      });
      
      card.appendChild(categoryDiv);
    }
  });

  return card;
}

function updateOverview(item, category, profile, checked) {
  const overview = document.getElementById('overview-categories');
  
  if (!overviewData[category]) {
    overviewData[category] = {};
  }
  
  if (!overviewData[category][item]) {
    overviewData[category][item] = {
      element: null,
      badges: {}
    };
  }
  
  const itemData = overviewData[category][item];
  
  if (checked) {
    itemData.badges[profile] = profile;
  } else {
    delete itemData.badges[profile];
  }
  
  // Créer ou mettre à jour l'élément d'aperçu
  if (Object.keys(itemData.badges).length === 0) {
    if (itemData.element) {
      itemData.element.remove();
    }
    delete overviewData[category][item];
    
    // Si la catégorie est vide, la supprimer
    if (Object.keys(overviewData[category]).length === 0) {
      delete overviewData[category];
    }
  } else {
    if (!itemData.element) {
      // Créer la catégorie si elle n'existe pas
      let categoryElement = overview.querySelector(`[data-category="${category}"]`);
      if (!categoryElement) {
        categoryElement = document.createElement('div');
        categoryElement.className = 'overview-category';
        categoryElement.dataset.category = category;
        
        const h3 = document.createElement('h3');
        const icon = document.createElement('i');
        icon.className = `fas ${CATEGORY_ICONS[category] || 'fa-circle'}`;
        h3.appendChild(icon);
        h3.appendChild(document.createTextNode(` ${category}`));
        
        categoryElement.appendChild(h3);
        overview.appendChild(categoryElement);
      }
      
      itemData.element = document.createElement('div');
      itemData.element.className = 'item-line';
      
      const name = document.createElement('span');
      name.textContent = item;
      
      const badge = document.createElement('span');
      badge.className = 'item-badge';
      badge.textContent = Object.keys(itemData.badges).length;
      
      const badgesContainer = document.createElement('div');
      badgesContainer.className = 'profile-tags';
      
      itemData.element.appendChild(badge);
      itemData.element.appendChild(name);
      itemData.element.appendChild(badgesContainer);
      
      categoryElement.appendChild(itemData.element);
    }
    
    // Mettre à jour les badges
    const badgesContainer = itemData.element.querySelector('.profile-tags');
    badgesContainer.innerHTML = '';
    
    // Mettre à jour le compteur
    itemData.element.querySelector('.item-badge').textContent = Object.keys(itemData.badges).length;
    
    // Ajouter les badges de profil
    Object.values(itemData.badges).forEach(profile => {
      const profBadge = document.createElement('span');
      profBadge.className = 'profile-tag ' + getRoleClass(profile);
      profBadge.textContent = formatProfileShort(profile);
      badgesContainer.appendChild(profBadge);
    });
  }
}

function updateSelectedCount(isAdding) {
  selectedItemsCount += isAdding ? 1 : -1;
  document.getElementById('selectedCount').textContent = selectedItemsCount;
}

function updateSummary() {
  document.getElementById('tankCount').textContent = roleCounters.Tank || 0;
  document.getElementById('healCount').textContent = roleCounters.Heal || 0;
  document.getElementById('dpsCount').textContent = roleCounters.DPS || 0;
  document.getElementById('totalCount').textContent = (roleCounters.Tank || 0) + (roleCounters.Heal || 0) + (roleCounters.DPS || 0);
}

function filterCards() {
  const filterValue = document.getElementById('roleFilter').value;
  const cards = document.querySelectorAll('.profile');
  
  cards.forEach(card => {
    if (filterValue === 'all' || card.dataset.role === filterValue) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

function sortCards() {
  const sortValue = document.getElementById('sortOption').value;
  const container = document.getElementById('profiles-grid');
  const cards = Array.from(container.querySelectorAll('.profile'));
  
  cards.sort((a, b) => {
    if (sortValue === 'role') {
      return a.dataset.role.localeCompare(b.dataset.role);
    } else if (sortValue === 'name') {
      return a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent);
    } else if (sortValue === 'nickname') {
      const nicknameA = a.dataset.nickname || '';
      const nicknameB = b.dataset.nickname || '';
      return nicknameA.localeCompare(nicknameB);
    }
  });
  
  // Vider et réorganiser le conteneur
  container.innerHTML = '';
  cards.forEach(card => container.appendChild(card));
}

function exportData() {
  const data = {
    overview: overviewData,
    summary: {
      tanks: roleCounters.Tank || 0,
      heals: roleCounters.Heal || 0,
      dps: roleCounters.DPS || 0,
      total: (roleCounters.Tank || 0) + (roleCounters.Heal || 0) + (roleCounters.DPS || 0),
      selectedItems: selectedItemsCount
    }
  };
  
  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = 'raid-configuration.json';
  link.click();
}

function resetSelections() {
  // Réinitialiser les cases à cocher
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  // Réinitialiser l'overview
  overviewData = {};
  document.getElementById('overview-categories').innerHTML = '';
  
  // Réinitialiser le compteur
  selectedItemsCount = 0;
  document.getElementById('selectedCount').textContent = 0;
}

function setStatus(message, type) {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  statusElement.className = '';
  
  if (type === 'loading') {
    statusElement.classList.add('status-loading');
    statusElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
  } else if (type === 'success') {
    statusElement.classList.add('status-success');
    statusElement.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
  } else if (type === 'error') {
    statusElement.classList.add('status-error');
    statusElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  }
}

// Helper functions
function formatProfileShort(profile) {
  if(profile.startsWith("Tank")) return "T" + profile.split(" ")[1];
  if(profile.startsWith("Heal")) return "H" + profile.split(" ")[1];
  if(profile.startsWith("DPS")) return "D" + profile.split(" ")[1];
  return profile;
}

function getRoleClass(profile) {
  if(profile.startsWith("Tank")) return "tank";
  if(profile.startsWith("Heal")) return "heal";
  if(profile.startsWith("DPS")) return "dps";
  return "";
}