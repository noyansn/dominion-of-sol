use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};
use rand::Rng;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkedIdentityRecord {
    pub provider: String,
    pub identifier: String,
    pub linked_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerLedgerEntry {
    pub transaction_id: String,
    pub idempotency_key: String,
    pub amount: i32,
    pub balance_after: u32,
    pub reason: String,
    pub sku: Option<String>,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerAccount {
    pub account_id: String,
    pub session_token: String,
    pub player_tag: String,
    pub display_name: String,
    pub account_type: String, // "guest" | "registered"
    pub linked_identities: Vec<LinkedIdentityRecord>,
    pub wallet_balance: u32,
    pub ledger: Vec<ServerLedgerEntry>,
    pub entitlements: HashSet<String>,
    pub equipped_blade_skin: String,
    pub reaction_wheel: Vec<String>,
    pub welcome_grant_claimed: bool,
    pub created_at: u64,
}

impl ServerAccount {
    pub fn to_snapshot(&self, is_dev_mode: bool) -> AccountSnapshot {
        AccountSnapshot {
            account_id: self.account_id.clone(),
            session_token: self.session_token.clone(),
            player_tag: self.player_tag.clone(),
            display_name: self.display_name.clone(),
            account_type: self.account_type.clone(),
            wallet_balance: self.wallet_balance,
            entitlements: self.entitlements.iter().cloned().collect(),
            equipped_blade_skin: self.equipped_blade_skin.clone(),
            reaction_wheel: self.reaction_wheel.clone(),
            linked_identities: self.linked_identities.clone(),
            is_dev_mode,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountSnapshot {
    pub account_id: String,
    pub session_token: String,
    pub player_tag: String,
    pub display_name: String,
    pub account_type: String,
    pub wallet_balance: u32,
    pub entitlements: Vec<String>,
    pub equipped_blade_skin: String,
    pub reaction_wheel: Vec<String>,
    pub linked_identities: Vec<LinkedIdentityRecord>,
    pub is_dev_mode: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkuDefinition {
    pub sku: String,
    pub cost_marks: u32,
    pub granted_entitlements: Vec<String>,
}

#[derive(Debug, Clone)]
pub enum LinkError {
    InvalidCredentials,
    Conflict { existing_account_id: String },
}

#[derive(Debug, Clone)]
pub enum PurchaseError {
    InvalidCredentials,
    UnknownSku,
    InsufficientBalance,
}

pub struct MetaStore {
    data_path: PathBuf,
    pub is_dev_mode: bool,
    accounts: HashMap<String, ServerAccount>,
    // provider:identifier -> account_id
    linked_index: HashMap<String, String>,
    catalog: HashMap<String, SkuDefinition>,
    universal_reactions: HashSet<String>,
}

fn now_sec() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn random_hex(len: usize) -> String {
    let mut rng = rand::thread_rng();
    (0..len)
        .map(|_| {
            let b: u8 = rng.gen_range(0..16);
            format!("{:x}", b)
        })
        .collect()
}

fn generate_tag() -> String {
    let chars = "0123456789ABCDEF";
    let mut rng = rand::thread_rng();
    let tag: String = (0..5)
        .map(|_| {
            let idx = rng.gen_range(0..chars.len());
            chars.chars().nth(idx).unwrap()
        })
        .collect();
    format!("#{}", tag)
}

fn sanitize_display_name(name: &str) -> String {
    let trimmed = name.trim();
    let clean: String = trimmed
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '-' || *c == '_')
        .collect();
    if clean.len() < 2 {
        "NOYAN".to_string()
    } else if clean.len() > 32 {
        clean[..32].to_string()
    } else {
        clean
    }
}

impl MetaStore {
    pub fn new<P: AsRef<Path>>(data_path: P, is_dev_mode: bool) -> Self {
        let mut store = Self {
            data_path: data_path.as_ref().to_path_buf(),
            is_dev_mode,
            accounts: HashMap::new(),
            linked_index: HashMap::new(),
            catalog: HashMap::new(),
            universal_reactions: HashSet::new(),
        };

        store.init_catalog();
        store.init_universal_reactions();
        store.load_from_disk();
        store
    }

    fn init_catalog(&mut self) {
        let items = [
            // 9 Civilization Command Blades
            ("dominion.blade.turk01", 450, vec!["blade_turk_imperial"]),
            ("dominion.blade.roma01", 450, vec!["blade_roma_legion"]),
            ("dominion.blade.han01", 450, vec!["blade_han_celestial"]),
            ("dominion.blade.yamato01", 450, vec!["blade_yamato_shogunate"]),
            ("dominion.blade.norse01", 450, vec!["blade_norse_raven"]),
            ("dominion.blade.pers01", 450, vec!["blade_pers_shamshir"]),
            ("dominion.blade.misir01", 450, vec!["blade_misir_khopesh"]),
            ("dominion.blade.maya01", 450, vec!["blade_maya_macuahuitl"]),
            ("dominion.blade.blackhills01", 450, vec!["blade_lakota_command"]),
            // 9 Civilization Reaction Packs (3 reactions per civ)
            ("dominion.reactions.turk.court01", 450, vec!["reaction_turk_standard", "reaction_turk_gate", "reaction_turk_salute"]),
            ("dominion.reactions.roma.legion01", 450, vec!["reaction_roma_aquila", "reaction_roma_shieldwall", "reaction_roma_triumph"]),
            ("dominion.reactions.pers.court01", 450, vec!["reaction_pers_lion", "reaction_pers_shamshir", "reaction_pers_court"]),
            ("dominion.reactions.misir.sun01", 450, vec!["reaction_misir_sun", "reaction_misir_ankh", "reaction_misir_pyramid"]),
            ("dominion.reactions.han.dragon01", 450, vec!["reaction_han_seal", "reaction_han_dragon", "reaction_han_bow"]),
            ("dominion.reactions.yamato.honor01", 450, vec!["reaction_yamato_sheathe", "reaction_yamato_torii", "reaction_yamato_bow"]),
            ("dominion.reactions.norse.raid01", 450, vec!["reaction_norse_strike", "reaction_norse_raven", "reaction_norse_horn"]),
            ("dominion.reactions.maya.astronomy01", 450, vec!["reaction_maya_glyph", "reaction_maya_quetzal", "reaction_maya_sun"]),
            ("dominion.reactions.lakota01", 450, vec!["reaction_lakota_fourwinds", "reaction_lakota_eagle", "reaction_lakota_campfire"]),
            // Season Pass
            ("dominion.pass.s1.premium", 1000, vec!["dominion.pass.s1.active"]),
        ];

        for (sku, cost, ents) in items {
            self.catalog.insert(
                sku.to_string(),
                SkuDefinition {
                    sku: sku.to_string(),
                    cost_marks: cost,
                    granted_entitlements: ents.into_iter().map(String::from).collect(),
                },
            );
        }
    }

    fn init_universal_reactions(&mut self) {
        let free = [
            "reaction_smile",     // 👍
            "reaction_laugh",     // 😂
            "reaction_surprised", // 😮
            "reaction_cry",       // 😢
            "reaction_angry",     // 😡
            "reaction_applause",  // 👏
            "reaction_smirk",     // 👀
            "reaction_gg",        // 😎
            "reaction_salute",
            "reaction_attack",
            "reaction_defense",
            "reaction_facepalm",
            "reaction_bored",
            "ping_attack",
            "ping_defend",
            "ping_danger",
            "ping_look",
        ];
        for r in free {
            self.universal_reactions.insert(r.to_string());
        }
    }

    fn load_from_disk(&mut self) {
        if !self.data_path.exists() {
            return;
        }
        if let Ok(content) = fs::read_to_string(&self.data_path) {
            if let Ok(accounts) = serde_json::from_str::<Vec<ServerAccount>>(&content) {
                for acc in accounts {
                    for link in &acc.linked_identities {
                        let key = format!("{}:{}", link.provider, link.identifier);
                        self.linked_index.insert(key, acc.account_id.clone());
                    }
                    self.accounts.insert(acc.account_id.clone(), acc);
                }
            }
        }
    }

    fn save_to_disk(&self) {
        if let Some(parent) = self.data_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let list: Vec<&ServerAccount> = self.accounts.values().collect();
        if let Ok(json) = serde_json::to_string_pretty(&list) {
            let tmp_path = self.data_path.with_extension("tmp");
            if fs::write(&tmp_path, json).is_ok() {
                let _ = fs::rename(&tmp_path, &self.data_path);
            }
        }
    }

    pub fn snapshot(&self, acc: &ServerAccount) -> AccountSnapshot {
        acc.to_snapshot(self.is_dev_mode)
    }

    pub fn create_guest(&mut self, name_hint: Option<String>) -> (ServerAccount, AccountSnapshot) {
        let account_id = format!("acc_{}", random_hex(12));
        let session_token = format!("tok_{}", random_hex(24));
        let player_tag = generate_tag();
        let display_name = sanitize_display_name(&name_hint.unwrap_or_else(|| "NOYAN".to_string()));
        let t = now_sec();

        // 100 Sovereign Marks Welcome Grant — authoritative and ONCE-ONLY
        let initial_marks = 100;
        let idempotency_key = format!("welcome:{}", account_id);
        let welcome_entry = ServerLedgerEntry {
            transaction_id: format!("tx_{}", random_hex(8)),
            idempotency_key,
            amount: initial_marks as i32,
            balance_after: initial_marks,
            reason: "WELCOME_GRANT".to_string(),
            sku: None,
            created_at: t,
        };

        let default_wheel = vec![
            "reaction_salute".to_string(),
            "reaction_gg".to_string(),
            "reaction_attack".to_string(),
            "reaction_defense".to_string(),
            "reaction_surprised".to_string(),
            "reaction_laugh".to_string(),
            "reaction_salute".to_string(),
            "reaction_gg".to_string(),
        ];

        let account = ServerAccount {
            account_id: account_id.clone(),
            session_token: session_token.clone(),
            player_tag,
            display_name,
            account_type: "guest".to_string(),
            linked_identities: Vec::new(),
            wallet_balance: initial_marks,
            ledger: vec![welcome_entry],
            entitlements: HashSet::new(),
            equipped_blade_skin: "blade_standard".to_string(),
            reaction_wheel: default_wheel,
            welcome_grant_claimed: true,
            created_at: t,
        };

        let snap = self.snapshot(&account);
        self.accounts.insert(account_id, account.clone());
        self.save_to_disk();
        (account, snap)
    }

    pub fn resume_session(&self, account_id: &str, session_token: &str) -> Option<AccountSnapshot> {
        let acc = self.accounts.get(account_id)?;
        if acc.session_token == session_token {
            Some(self.snapshot(acc))
        } else {
            None
        }
    }

    pub fn link_account(
        &mut self,
        account_id: &str,
        session_token: &str,
        provider: &str,
        identifier: &str,
    ) -> Result<AccountSnapshot, LinkError> {
        let index_key = format!("{}:{}", provider, identifier);

        // Account conflict check: Is provider identifier already linked to another account?
        if let Some(existing_acc_id) = self.linked_index.get(&index_key) {
            if existing_acc_id != account_id {
                return Err(LinkError::Conflict {
                    existing_account_id: existing_acc_id.clone(),
                });
            }
        }

        let acc = self
            .accounts
            .get_mut(account_id)
            .ok_or(LinkError::InvalidCredentials)?;

        if acc.session_token != session_token {
            return Err(LinkError::InvalidCredentials);
        }

        // Link identity, preserving EXACT SAME accountId, marks, entitlements, loadout
        acc.linked_identities.push(LinkedIdentityRecord {
            provider: provider.to_string(),
            identifier: identifier.to_string(),
            linked_at: now_sec(),
        });
        acc.account_type = "registered".to_string();

        self.linked_index.insert(index_key, account_id.to_string());
        let is_dev = self.is_dev_mode;
        let snap = acc.to_snapshot(is_dev);
        self.save_to_disk();
        Ok(snap)
    }

    pub fn purchase_sku(
        &mut self,
        account_id: &str,
        session_token: &str,
        sku: &str,
        idempotency_key: &str,
    ) -> Result<AccountSnapshot, PurchaseError> {
        let acc = self
            .accounts
            .get_mut(account_id)
            .ok_or(PurchaseError::InvalidCredentials)?;

        if acc.session_token != session_token {
            return Err(PurchaseError::InvalidCredentials);
        }

        // Idempotency check: Has this transaction already been processed?
        if acc.ledger.iter().any(|e| e.idempotency_key == idempotency_key) {
            // Already processed: return current snapshot without double charge
            let is_dev = self.is_dev_mode;
            return Ok(acc.to_snapshot(is_dev));
        }

        let sku_def = self
            .catalog
            .get(sku)
            .ok_or(PurchaseError::UnknownSku)?
            .clone();

        if acc.wallet_balance < sku_def.cost_marks {
            return Err(PurchaseError::InsufficientBalance);
        }

        // Authoritative deduction and entitlement grant
        acc.wallet_balance -= sku_def.cost_marks;
        for ent in sku_def.granted_entitlements {
            acc.entitlements.insert(ent);
        }

        acc.ledger.push(ServerLedgerEntry {
            transaction_id: format!("tx_{}", random_hex(8)),
            idempotency_key: idempotency_key.to_string(),
            amount: -(sku_def.cost_marks as i32),
            balance_after: acc.wallet_balance,
            reason: format!("PURCHASE_{}", sku),
            sku: Some(sku.to_string()),
            created_at: now_sec(),
        });

        let is_dev = self.is_dev_mode;
        let snap = acc.to_snapshot(is_dev);
        self.save_to_disk();
        Ok(snap)
    }

    pub fn equip_loadout(
        &mut self,
        account_id: &str,
        session_token: &str,
        blade_skin: Option<String>,
        reaction_wheel: Option<Vec<String>>,
    ) -> Result<AccountSnapshot, &'static str> {
        let acc = self
            .accounts
            .get_mut(account_id)
            .ok_or("Invalid account credentials")?;

        if acc.session_token != session_token {
            return Err("Invalid session token");
        }

        if let Some(skin) = blade_skin {
            if skin == "blade_standard" || acc.entitlements.contains(&skin) {
                acc.equipped_blade_skin = skin;
            } else {
                // Reject unowned blade skin, fallback to standard
                acc.equipped_blade_skin = "blade_standard".to_string();
                return Err("Unowned blade skin: fallback to standard");
            }
        }

        if let Some(wheel) = reaction_wheel {
            let mut validated_wheel = Vec::new();
            for r in wheel {
                if self.universal_reactions.contains(&r) || acc.entitlements.contains(&r) {
                    validated_wheel.push(r);
                } else {
                    // Fallback to universal salute if unowned reaction injected
                    validated_wheel.push("reaction_salute".to_string());
                }
            }
            if validated_wheel.len() == 8 {
                acc.reaction_wheel = validated_wheel;
            }
        }

        let is_dev = self.is_dev_mode;
        let snap = acc.to_snapshot(is_dev);
        self.save_to_disk();
        Ok(snap)
    }

    pub fn dev_command(
        &mut self,
        account_id: &str,
        session_token: &str,
        action: &str,
        marks_delta: Option<i32>,
        sku: Option<String>,
    ) -> Result<AccountSnapshot, &'static str> {
        // Strict security: Reject dev commands if production mode
        if !self.is_dev_mode {
            return Err("DEV_COMMANDS_REJECTED_IN_PRODUCTION");
        }

        let acc = self
            .accounts
            .get_mut(account_id)
            .ok_or("Invalid credentials")?;

        if acc.session_token != session_token {
            return Err("Invalid credentials");
        }

        match action {
            "add_marks" => {
                let delta = marks_delta.unwrap_or(500);
                if delta < 0 && (acc.wallet_balance as i32 + delta) < 0 {
                    acc.wallet_balance = 0;
                } else {
                    acc.wallet_balance = (acc.wallet_balance as i32 + delta) as u32;
                }
                acc.ledger.push(ServerLedgerEntry {
                    transaction_id: format!("tx_{}", random_hex(8)),
                    idempotency_key: format!("dev_grant_{}", random_hex(6)),
                    amount: delta,
                    balance_after: acc.wallet_balance,
                    reason: "DEV_GRANT_MARKS".to_string(),
                    sku: None,
                    created_at: now_sec(),
                });
            }
            "grant_sku" => {
                if let Some(s) = sku {
                    if let Some(def) = self.catalog.get(&s) {
                        for ent in &def.granted_entitlements {
                            acc.entitlements.insert(ent.clone());
                        }
                        acc.ledger.push(ServerLedgerEntry {
                            transaction_id: format!("tx_{}", random_hex(8)),
                            idempotency_key: format!("dev_grant_sku_{}", random_hex(6)),
                            amount: 0,
                            balance_after: acc.wallet_balance,
                            reason: format!("DEV_GRANT_SKU_{}", s),
                            sku: Some(s),
                            created_at: now_sec(),
                        });
                    }
                }
            }
            "own_all" => {
                for def in self.catalog.values() {
                    for ent in &def.granted_entitlements {
                        acc.entitlements.insert(ent.clone());
                    }
                }
            }
            "reset_account" => {
                acc.wallet_balance = 100;
                acc.entitlements.clear();
                acc.equipped_blade_skin = "blade_standard".to_string();
                acc.ledger.retain(|e| e.reason == "WELCOME_GRANT");
            }
            _ => return Err("Unknown dev command"),
        }

        let is_dev = self.is_dev_mode;
        let snap = acc.to_snapshot(is_dev);
        self.save_to_disk();
        Ok(snap)
    }

    pub fn is_reaction_usable(&self, account_id: &str, reaction_id: &str) -> bool {
        if self.universal_reactions.contains(reaction_id) {
            return true;
        }
        if let Some(acc) = self.accounts.get(account_id) {
            acc.entitlements.contains(reaction_id)
        } else {
            false
        }
    }
}

pub type SharedMetaStore = Arc<RwLock<MetaStore>>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_server_authoritative_guest_and_welcome_grant() {
        let path = "target/test_meta_store_guest.json";
        let _ = std::fs::remove_file(path);
        let mut store = MetaStore::new(path, true);
        let (acc, snap) = store.create_guest(Some("TÜRKİYE".to_string()));

        assert!(acc.account_id.starts_with("acc_"));
        assert!(acc.session_token.starts_with("tok_"));
        assert!(acc.player_tag.starts_with('#'));
        assert_eq!(acc.display_name, "TÜRKİYE");
        assert_eq!(acc.wallet_balance, 100);
        assert!(acc.welcome_grant_claimed);
        assert_eq!(snap.wallet_balance, 100);

        // Resume session
        let resumed = store.resume_session(&acc.account_id, &acc.session_token);
        assert!(resumed.is_some());
        assert_eq!(resumed.unwrap().account_id, acc.account_id);
    }

    #[test]
    fn test_idempotent_purchase_and_insufficient_balance() {
        let path = "target/test_meta_store_purchase.json";
        let _ = std::fs::remove_file(path);
        let mut store = MetaStore::new(path, true);
        let (acc, _) = store.create_guest(Some("NOYAN".to_string()));

        // Initial balance is 100. Sku costs 450. Purchase must fail.
        let fail_res = store.purchase_sku(
            &acc.account_id,
            &acc.session_token,
            "dominion.blade.turk01",
            "tx_key_1",
        );
        assert!(matches!(fail_res, Err(PurchaseError::InsufficientBalance)));

        // Dev grant 1000 marks
        store.dev_command(&acc.account_id, &acc.session_token, "add_marks", Some(1000), None).unwrap();
        
        // Now balance is 1100. Purchase should succeed.
        let succ_res = store.purchase_sku(
            &acc.account_id,
            &acc.session_token,
            "dominion.blade.turk01",
            "tx_key_1",
        ).unwrap();
        assert_eq!(succ_res.wallet_balance, 650);
        assert!(succ_res.entitlements.contains(&"blade_turk_imperial".to_string()));

        // Duplicate purchase with SAME idempotency key must NOT deduct again!
        let dup_res = store.purchase_sku(
            &acc.account_id,
            &acc.session_token,
            "dominion.blade.turk01",
            "tx_key_1",
        ).unwrap();
        assert_eq!(dup_res.wallet_balance, 650);
    }

    #[test]
    fn test_account_linking_conflict_and_preservation() {
        let path = "target/test_meta_store_link.json";
        let _ = std::fs::remove_file(path);
        let mut store = MetaStore::new(path, true);
        let (acc_a, _) = store.create_guest(Some("PlayerA".to_string()));
        let (acc_b, _) = store.create_guest(Some("PlayerB".to_string()));

        // Link acc_a to google:test@dominion.com
        store.link_account(&acc_a.account_id, &acc_a.session_token, "google", "test@dominion.com").unwrap();

        // acc_b tries to link to same google:test@dominion.com -> MUST FAIL with Conflict
        let conflict = store.link_account(&acc_b.account_id, &acc_b.session_token, "google", "test@dominion.com");
        assert!(matches!(conflict, Err(LinkError::Conflict { .. })));
    }

    #[test]
    fn test_production_mode_rejects_dev_commands() {
        let path = "target/test_meta_store_prod.json";
        let _ = std::fs::remove_file(path);
        let mut store = MetaStore::new(path, false); // is_dev_mode = false
        let (acc, _) = store.create_guest(Some("PlayerProd".to_string()));

        let res = store.dev_command(&acc.account_id, &acc.session_token, "add_marks", Some(9999), None);
        assert_eq!(res.unwrap_err(), "DEV_COMMANDS_REJECTED_IN_PRODUCTION");
    }

    #[test]
    fn test_unowned_blade_and_reaction_rejection() {
        let path = "target/test_meta_store_equip.json";
        let _ = std::fs::remove_file(path);
        let mut store = MetaStore::new(path, true);
        let (acc, _) = store.create_guest(Some("PlayerEquip".to_string()));

        // Attempt to equip unowned premium blade
        let res = store.equip_loadout(
            &acc.account_id,
            &acc.session_token,
            Some("blade_roma_legion".to_string()),
            None,
        );
        assert!(res.is_err());
        assert_eq!(res.unwrap_err(), "Unowned blade skin: fallback to standard");

        // Attempt to equip standard blade -> allowed
        let res2 = store.equip_loadout(
            &acc.account_id,
            &acc.session_token,
            Some("blade_standard".to_string()),
            None,
        );
        assert!(res2.is_ok());

        // Reaction check
        assert!(store.is_reaction_usable(&acc.account_id, "reaction_salute")); // Free universal
        assert!(!store.is_reaction_usable(&acc.account_id, "reaction_roma_aquila")); // Unowned premium
    }
}
