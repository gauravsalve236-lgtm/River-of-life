const db = require('../db/connection');

// --- 1. CHURCHES CMS API ---
async function getChurches(req, res) {
  try {
    const churches = await db.all("SELECT * FROM churches ORDER BY created_at DESC");
    res.json({ success: true, churches });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch churches database: " + err.message });
  }
}

async function createChurch(req, res) {
  try {
    const { name, city, state, address, phone, email, website, pastor_name, cover_image, logo_image, service_timings, description, status } = req.body;
    if (!name || !city) {
      return res.status(400).json({ error: "Church name and city are required." });
    }
    const id = "ch_" + Date.now();
    const timingsJson = typeof service_timings === "string" ? service_timings : JSON.stringify(service_timings || []);
    
    await db.run(
      `INSERT INTO churches (id, name, city, state, address, phone, email, website, pastor_name, cover_image, logo_image, service_timings, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, city, state || 'Maharashtra', address || '', phone || '', email || '', website || '', pastor_name || '', cover_image || '', logo_image || '', timingsJson, description || '', status || 'Published']
    );

    const newChurch = await db.get("SELECT * FROM churches WHERE id = ?", [id]);
    res.status(201).json({ success: true, message: "Church registered successfully!", church: newChurch });
  } catch (err) {
    res.status(500).json({ error: "Failed to create church: " + err.message });
  }
}

async function updateChurch(req, res) {
  try {
    const { id } = req.params;
    const { name, city, state, address, phone, email, website, pastor_name, cover_image, logo_image, service_timings, description, status } = req.body;
    const timingsJson = typeof service_timings === "string" ? service_timings : JSON.stringify(service_timings || []);

    await db.run(
      `UPDATE churches 
       SET name=?, city=?, state=?, address=?, phone=?, email=?, website=?, pastor_name=?, cover_image=?, logo_image=?, service_timings=?, description=?, status=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      [name, city, state, address, phone, email, website, pastor_name, cover_image, logo_image, timingsJson, description, status, id]
    );

    const updated = await db.get("SELECT * FROM churches WHERE id = ?", [id]);
    res.json({ success: true, message: "Church updated successfully!", church: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update church: " + err.message });
  }
}

async function deleteChurch(req, res) {
  try {
    const { id } = req.params;
    await db.run("DELETE FROM churches WHERE id = ?", [id]);
    res.json({ success: true, message: "Church deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete church: " + err.message });
  }
}

// --- 2. HYMNS CMS API ---
async function getHymns(req, res) {
  try {
    const hymns = await db.all("SELECT * FROM hymns ORDER BY hymn_number ASC");
    res.json({ success: true, hymns });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch hymns database: " + err.message });
  }
}

async function createHymn(req, res) {
  try {
    const { hymn_number, title_mr, title_en, category, lyrics_mr, chords, audio_url, status } = req.body;
    if (!hymn_number || !title_mr || !lyrics_mr) {
      return res.status(400).json({ error: "Hymn number, Marathi title, and lyrics are required." });
    }
    const id = "hymn_" + Date.now();
    await db.run(
      `INSERT INTO hymns (id, hymn_number, title_mr, title_en, category, lyrics_mr, chords, audio_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, parseInt(hymn_number, 10), title_mr, title_en || title_mr, category || 'Worship', lyrics_mr, chords || '', audio_url || '', status || 'Published']
    );

    const newHymn = await db.get("SELECT * FROM hymns WHERE id = ?", [id]);
    res.status(201).json({ success: true, message: "Hymn added successfully!", hymn: newHymn });
  } catch (err) {
    res.status(500).json({ error: "Failed to create hymn: " + err.message });
  }
}

async function updateHymn(req, res) {
  try {
    const { id } = req.params;
    const { hymn_number, title_mr, title_en, category, lyrics_mr, chords, audio_url, status } = req.body;

    await db.run(
      `UPDATE hymns 
       SET hymn_number=?, title_mr=?, title_en=?, category=?, lyrics_mr=?, chords=?, audio_url=?, status=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      [parseInt(hymn_number, 10), title_mr, title_en, category, lyrics_mr, chords, audio_url, status, id]
    );

    const updated = await db.get("SELECT * FROM hymns WHERE id = ?", [id]);
    res.json({ success: true, message: "Hymn updated successfully!", hymn: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update hymn: " + err.message });
  }
}

async function deleteHymn(req, res) {
  try {
    const { id } = req.params;
    await db.run("DELETE FROM hymns WHERE id = ?", [id]);
    res.json({ success: true, message: "Hymn deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete hymn: " + err.message });
  }
}

// --- 3. HOMEPAGE BUILDER & COMPONENTS API ---
async function getHomepageLayout(req, res) {
  try {
    const sections = await db.all("SELECT * FROM homepage_sections WHERE is_visible = 1 ORDER BY sort_order ASC");
    const components = await db.all("SELECT * FROM homepage_components WHERE status = 'Published' ORDER BY sort_order ASC");

    const fullLayout = sections.map(sec => ({
      ...sec,
      components: components.filter(c => c.section_id === sec.id)
    }));

    res.json({ success: true, layout: fullLayout, sections, components });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch homepage layout: " + err.message });
  }
}

async function updateHomepageSections(req, res) {
  try {
    const { sections } = req.body;
    if (!Array.isArray(sections)) {
      return res.status(400).json({ error: "Sections array is required." });
    }

    for (let sec of sections) {
      await db.run(
        `UPDATE homepage_sections SET sort_order = ?, is_visible = ?, title = ?, subtitle = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [sec.sort_order, sec.is_visible ? 1 : 0, sec.title, sec.subtitle, sec.id]
      );
    }

    res.json({ success: true, message: "Homepage sections updated successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update homepage sections: " + err.message });
  }
}

async function createHomepageComponent(req, res) {
  try {
    const { section_id, component_type, title, subtitle, description, image_url, icon, button_text, click_action, design_config } = req.body;
    const id = "comp_" + Date.now();
    const configJson = typeof design_config === "string" ? design_config : JSON.stringify(design_config || {});

    await db.run(
      `INSERT INTO homepage_components (id, section_id, component_type, title, subtitle, description, image_url, icon, button_text, click_action, design_config)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, section_id, component_type || 'Card', title, subtitle || '', description || '', image_url || '', icon || '✨', button_text || 'Open', click_action || '#/home', configJson]
    );

    const comp = await db.get("SELECT * FROM homepage_components WHERE id = ?", [id]);
    res.status(201).json({ success: true, message: "Homepage component added!", component: comp });
  } catch (err) {
    res.status(500).json({ error: "Failed to create component: " + err.message });
  }
}

// --- 4. NAVIGATION MENUS API ---
async function getNavigation(req, res) {
  try {
    const menus = await db.all("SELECT * FROM navigation_menus");
    const items = await db.all("SELECT * FROM menu_items WHERE is_visible = 1 ORDER BY sort_order ASC");

    const navData = menus.map(m => ({
      ...m,
      items: items.filter(i => i.menu_id === m.id)
    }));

    res.json({ success: true, navigation: navData, items });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch navigation: " + err.message });
  }
}

async function updateNavigationItems(req, res) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Items array is required." });
    }

    for (let item of items) {
      await db.run(
        `UPDATE menu_items SET label_mr = ?, label_en = ?, icon = ?, target_route = ?, sort_order = ?, is_visible = ? WHERE id = ?`,
        [item.label_mr, item.label_en, item.icon, item.target_route, item.sort_order, item.is_visible ? 1 : 0, item.id]
      );
    }

    res.json({ success: true, message: "Navigation menu updated successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update navigation: " + err.message });
  }
}

// --- 5. THEME & APPEARANCE API ---
async function getThemeConfig(req, res) {
  try {
    let theme = await db.get("SELECT * FROM app_theme_config WHERE id = 'current_theme'");
    if (!theme) {
      theme = { primary_color: '#1e6b77', secondary_color: '#d97706', accent_color: '#7c3aed', bg_color: '#f8fafc', surface_color: '#ffffff', text_color: '#0f172a' };
    }
    res.json({ success: true, theme });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch theme config: " + err.message });
  }
}

async function updateThemeConfig(req, res) {
  try {
    const { primary_color, secondary_color, accent_color, bg_color, surface_color, text_color, font_family, border_radius, logo_url } = req.body;
    
    await db.run(
      `INSERT INTO app_theme_config (id, primary_color, secondary_color, accent_color, bg_color, surface_color, text_color, font_family, border_radius, logo_url, updated_at)
       VALUES ('current_theme', ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET 
       primary_color=excluded.primary_color, secondary_color=excluded.secondary_color, accent_color=excluded.accent_color,
       bg_color=excluded.bg_color, surface_color=excluded.surface_color, text_color=excluded.text_color,
       font_family=excluded.font_family, border_radius=excluded.border_radius, logo_url=excluded.logo_url, updated_at=CURRENT_TIMESTAMP`,
      [primary_color, secondary_color, accent_color, bg_color, surface_color, text_color, font_family || 'Outfit, sans-serif', border_radius || '16px', logo_url || 'assets/icons/app-logo.png']
    );

    const updated = await db.get("SELECT * FROM app_theme_config WHERE id = 'current_theme'");
    res.json({ success: true, message: "Theme configuration saved successfully!", theme: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to save theme config: " + err.message });
  }
}

// --- 6. APP FEATURE FLAGS API ---
async function getFeatureFlags(req, res) {
  try {
    const flags = await db.all("SELECT * FROM app_feature_flags");
    res.json({ success: true, flags });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch feature flags: " + err.message });
  }
}

async function updateFeatureFlag(req, res) {
  try {
    const { feature_key, is_enabled } = req.body;
    await db.run(
      "UPDATE app_feature_flags SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE feature_key = ?",
      [is_enabled ? 1 : 0, feature_key]
    );
    res.json({ success: true, message: `Feature '${feature_key}' updated to ${is_enabled ? 'ENABLED' : 'DISABLED'}` });
  } catch (err) {
    res.status(500).json({ error: "Failed to update feature flag: " + err.message });
  }
}

// --- 7. EVENTS & CONFERENCES CMS API ---
async function getEvents(req, res) {
  try {
    const events = await db.all("SELECT * FROM events ORDER BY start_date ASC");
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch events: " + err.message });
  }
}

async function createEvent(req, res) {
  try {
    const { title, event_type, start_date, end_date, location, poster_image, registration_link, meeting_link, description, status } = req.body;
    const id = "evt_" + Date.now();
    await db.run(
      `INSERT INTO events (id, title, event_type, start_date, end_date, location, poster_image, registration_link, meeting_link, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, event_type || 'Conference', start_date, end_date || start_date, location || 'Online / Church Hall', poster_image || '', registration_link || '', meeting_link || '', description || '', status || 'Published']
    );
    const newEvt = await db.get("SELECT * FROM events WHERE id = ?", [id]);
    res.status(201).json({ success: true, message: "Event created successfully!", event: newEvt });
  } catch (err) {
    res.status(500).json({ error: "Failed to create event: " + err.message });
  }
}

async function deleteEvent(req, res) {
  try {
    const { id } = req.params;
    await db.run("DELETE FROM events WHERE id = ?", [id]);
    res.json({ success: true, message: "Event deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete event: " + err.message });
  }
}

// --- 8. ANNOUNCEMENTS & ALERTS API ---
async function getAnnouncements(req, res) {
  try {
    const announcements = await db.all("SELECT * FROM announcements ORDER BY created_at DESC");
    res.json({ success: true, announcements });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch announcements: " + err.message });
  }
}

async function createAnnouncement(req, res) {
  try {
    const { title, message, priority, action_label, action_url, is_active } = req.body;
    const id = "anc_" + Date.now();
    await db.run(
      `INSERT INTO announcements (id, title, message, priority, action_label, action_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, title, message, priority || 'Normal', action_label || 'View', action_url || '#/home', is_active ? 1 : 0]
    );
    res.status(201).json({ success: true, message: "Announcement published successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to create announcement: " + err.message });
  }
}

async function deleteAnnouncement(req, res) {
  try {
    const { id } = req.params;
    await db.run("DELETE FROM announcements WHERE id = ?", [id]);
    res.json({ success: true, message: "Announcement deleted." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete announcement: " + err.message });
  }
}

module.exports = {
  getChurches,
  createChurch,
  updateChurch,
  deleteChurch,
  getHymns,
  createHymn,
  updateHymn,
  deleteHymn,
  getHomepageLayout,
  updateHomepageSections,
  createHomepageComponent,
  getNavigation,
  updateNavigationItems,
  getThemeConfig,
  updateThemeConfig,
  getFeatureFlags,
  updateFeatureFlag,
  getEvents,
  createEvent,
  deleteEvent,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement
};
