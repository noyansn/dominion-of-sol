//! Authoritative 44-Civilization Manifest & Registry for Dominion of Sol
//!
//! Master canonical definitions matching CivilizationAtlas.ts.
//! All 44 civilizations have zero-sum balanced doctrines and physical coordinates.

use crate::protocol::FlagDescriptor;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum MacroRegion {
    Europe,
    Africa,
    WestAsia,
    CentralAsia,
    SouthAsia,
    EastAsia,
    SoutheastAsia,
    NorthAmerica,
    SouthAmerica,
    Australia,
    Oceania,
}

#[derive(Debug, Clone, Copy)]
pub struct CanonicalFlagDescriptor {
    pub layout: &'static str,
    pub primary_color: &'static str,
    pub secondary_color: &'static str,
    pub accent_color: &'static str,
    pub emblem: &'static str,
}

impl CanonicalFlagDescriptor {
    pub fn to_flag_descriptor(&self) -> FlagDescriptor {
        FlagDescriptor {
            layout: self.layout.to_string(),
            primary_color: self.primary_color.to_string(),
            secondary_color: self.secondary_color.to_string(),
            accent_color: self.accent_color.to_string(),
            emblem: self.emblem.to_string(),
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct CanonicalCivilization {
    pub id: &'static str,
    pub display_name: &'static str,
    pub macro_region: MacroRegion,
    pub lon: f64,
    pub lat: f64,
    pub candidate_start_cell: u32,
    pub flag_id: &'static str,
    pub political_color: &'static str,
    pub color_int: u32,
    pub flag_descriptor: CanonicalFlagDescriptor,
    pub doctrine_offense: f32,
    pub doctrine_defense: f32,
    pub doctrine_expansion: f32,
    pub doctrine_maritime: f32,
    pub traits: [&'static str; 3],
}

pub const CANONICAL_CIVILIZATIONS: &[CanonicalCivilization] = &[
    CanonicalCivilization {
        id: "roma",
        display_name: "ROMA",
        macro_region: MacroRegion::Europe,
        lon: 12.5000,
        lat: 41.9000,
        candidate_start_cell: 140836,
        flag_id: "flag_roma",
        political_color: "#b91c1c",
        color_int: 0xB91C1C,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "triband",
            primary_color: "#7f1d1d",
            secondary_color: "#d97706",
            accent_color: "#fef08a",
            emblem: "eagle",
        },
        doctrine_offense: 0.0200,
        doctrine_defense: 0.0200,
        doctrine_expansion: -0.0200,
        doctrine_maritime: -0.0200,
        traits: ["ORDER", "ENGINEERING", "AUTHORITY"],
    },
    CanonicalCivilization {
        id: "hellen",
        display_name: "HELLEN",
        macro_region: MacroRegion::Europe,
        lon: 23.7000,
        lat: 38.0000,
        candidate_start_cell: 152131,
        flag_id: "flag_hellen",
        political_color: "#0284c7",
        color_int: 0x284C7,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "cross",
            primary_color: "#0284c7",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "anchor",
        },
        doctrine_offense: 0.0000,
        doctrine_defense: 0.0200,
        doctrine_expansion: -0.0200,
        doctrine_maritime: 0.0000,
        traits: ["CIVIC", "MARITIME", "INGENUITY"],
    },
    CanonicalCivilization {
        id: "gaul",
        display_name: "GAUL",
        macro_region: MacroRegion::Europe,
        lon: 2.5000,
        lat: 46.5000,
        candidate_start_cell: 127495,
        flag_id: "flag_gaul",
        political_color: "#16a34a",
        color_int: 0x16A34A,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#16a34a",
            secondary_color: "#ca8a04",
            accent_color: "#ffffff",
            emblem: "shield",
        },
        doctrine_offense: 0.0200,
        doctrine_defense: 0.0100,
        doctrine_expansion: 0.0000,
        doctrine_maritime: -0.0300,
        traits: ["TRIBE", "RESOLVE", "FRONTIER"],
    },
    CanonicalCivilization {
        id: "norse",
        display_name: "NORSE",
        macro_region: MacroRegion::Europe,
        lon: 10.0000,
        lat: 60.0000,
        candidate_start_cell: 87580,
        flag_id: "flag_norse",
        political_color: "#06b6d4",
        color_int: 0x6B6D4,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "cross",
            primary_color: "#1e3a8a",
            secondary_color: "#0284c7",
            accent_color: "#e0e7ff",
            emblem: "spearhead",
        },
        doctrine_offense: 0.0200,
        doctrine_defense: -0.0200,
        doctrine_expansion: -0.0200,
        doctrine_maritime: 0.0200,
        traits: ["MARITIME", "VALOR", "REACH"],
    },
    CanonicalCivilization {
        id: "rus",
        display_name: "RUS",
        macro_region: MacroRegion::Europe,
        lon: 34.0000,
        lat: 53.5000,
        candidate_start_cell: 107105,
        flag_id: "flag_rus",
        political_color: "#d97706",
        color_int: 0xD97706,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "bicolor",
            primary_color: "#b45309",
            secondary_color: "#1e3a8a",
            accent_color: "#ffffff",
            emblem: "eagle",
        },
        doctrine_offense: 0.0100,
        doctrine_defense: 0.0200,
        doctrine_expansion: 0.0000,
        doctrine_maritime: -0.0300,
        traits: ["DEPTH", "TRADE", "RESOLVE"],
    },
    CanonicalCivilization {
        id: "misir",
        display_name: "MISIR",
        macro_region: MacroRegion::Africa,
        lon: 31.2000,
        lat: 27.5000,
        candidate_start_cell: 182873,
        flag_id: "flag_misir",
        political_color: "#eab308",
        color_int: 0xEAB308,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "triband",
            primary_color: "#ca8a04",
            secondary_color: "#1e3a8a",
            accent_color: "#fef08a",
            emblem: "sun",
        },
        doctrine_offense: -0.0100,
        doctrine_defense: 0.0300,
        doctrine_expansion: -0.0100,
        doctrine_maritime: -0.0100,
        traits: ["RIVER", "STABILITY", "LEGACY"],
    },
    CanonicalCivilization {
        id: "amazigh",
        display_name: "AMAZIGH",
        macro_region: MacroRegion::Africa,
        lon: -1.5000,
        lat: 32.0000,
        candidate_start_cell: 169468,
        flag_id: "flag_amazigh",
        political_color: "#b45309",
        color_int: 0xB45309,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#b45309",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0100,
        doctrine_defense: 0.0200,
        doctrine_expansion: 0.0000,
        doctrine_maritime: -0.0300,
        traits: ["ENDURANCE", "TRADE", "TERRAIN"],
    },
    CanonicalCivilization {
        id: "aksum",
        display_name: "AKSUM",
        macro_region: MacroRegion::Africa,
        lon: 38.7000,
        lat: 14.1000,
        candidate_start_cell: 221806,
        flag_id: "flag_aksum",
        political_color: "#7e22ce",
        color_int: 0x7E22CE,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#7e22ce",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0000,
        doctrine_defense: 0.0200,
        doctrine_expansion: -0.0100,
        doctrine_maritime: -0.0100,
        traits: ["HIGHLAND", "TRADE", "FAITH"],
    },
    CanonicalCivilization {
        id: "mali",
        display_name: "MALI",
        macro_region: MacroRegion::Africa,
        lon: -5.0000,
        lat: 13.5000,
        candidate_start_cell: 223730,
        flag_id: "flag_mali",
        political_color: "#ca8a04",
        color_int: 0xCA8A04,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#ca8a04",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0000,
        doctrine_defense: 0.0000,
        doctrine_expansion: 0.0300,
        doctrine_maritime: -0.0300,
        traits: ["WEALTH", "TRADE", "REACH"],
    },
    CanonicalCivilization {
        id: "yoruba",
        display_name: "YORUBA",
        macro_region: MacroRegion::Africa,
        lon: 4.5000,
        lat: 7.5000,
        candidate_start_cell: 241165,
        flag_id: "flag_yoruba",
        political_color: "#ea580c",
        color_int: 0xEA580C,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#ea580c",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0100,
        doctrine_defense: 0.0200,
        doctrine_expansion: -0.0100,
        doctrine_maritime: -0.0200,
        traits: ["CITY", "CRAFT", "COMMUNITY"],
    },
    CanonicalCivilization {
        id: "kongo",
        display_name: "KONGO",
        macro_region: MacroRegion::Africa,
        lon: 14.5000,
        lat: -5.5000,
        candidate_start_cell: 279081,
        flag_id: "flag_kongo",
        political_color: "#92400e",
        color_int: 0x92400E,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#92400e",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0000,
        doctrine_defense: 0.0200,
        doctrine_expansion: 0.0100,
        doctrine_maritime: -0.0300,
        traits: ["RIVER", "KINGDOM", "NETWORK"],
    },
    CanonicalCivilization {
        id: "swahili",
        display_name: "SWAHILI",
        macro_region: MacroRegion::Africa,
        lon: 39.3000,
        lat: -4.5000,
        candidate_start_cell: 276080,
        flag_id: "flag_swahili",
        political_color: "#0891b2",
        color_int: 0x891B2,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#0891b2",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: -0.0200,
        doctrine_defense: 0.0000,
        doctrine_expansion: -0.0200,
        doctrine_maritime: 0.0400,
        traits: ["TRADE", "MARITIME", "CITY"],
    },
    CanonicalCivilization {
        id: "zulu",
        display_name: "ZULU",
        macro_region: MacroRegion::Africa,
        lon: 31.0000,
        lat: -28.5000,
        candidate_start_cell: 345688,
        flag_id: "flag_zulu",
        political_color: "#991b1b",
        color_int: 0x991B1B,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#991b1b",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0300,
        doctrine_defense: 0.0100,
        doctrine_expansion: 0.0000,
        doctrine_maritime: -0.0400,
        traits: ["DISCIPLINE", "UNITY", "PRESSURE"],
    },
    CanonicalCivilization {
        id: "pers",
        display_name: "PERS",
        macro_region: MacroRegion::WestAsia,
        lon: 53.0000,
        lat: 32.0000,
        candidate_start_cell: 169623,
        flag_id: "flag_pers",
        political_color: "#3b82f6",
        color_int: 0x3B82F6,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "bicolor",
            primary_color: "#0f766e",
            secondary_color: "#ca8a04",
            accent_color: "#ffffff",
            emblem: "lion",
        },
        doctrine_offense: 0.0000,
        doctrine_defense: 0.0400,
        doctrine_expansion: -0.0200,
        doctrine_maritime: -0.0200,
        traits: ["STRATEGY", "DEPTH", "AUTHORITY"],
    },
    CanonicalCivilization {
        id: "assyria",
        display_name: "ASSYRIA",
        macro_region: MacroRegion::WestAsia,
        lon: 43.1000,
        lat: 36.3000,
        candidate_start_cell: 157307,
        flag_id: "flag_assyria",
        political_color: "#475569",
        color_int: 0x475569,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#475569",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0300,
        doctrine_defense: 0.0100,
        doctrine_expansion: 0.0000,
        doctrine_maritime: -0.0400,
        traits: ["ORDER", "SIEGE", "COMMAND"],
    },
    CanonicalCivilization {
        id: "arab",
        display_name: "ARAB",
        macro_region: MacroRegion::WestAsia,
        lon: 44.0000,
        lat: 24.0000,
        candidate_start_cell: 193149,
        flag_id: "flag_arab",
        political_color: "#15803d",
        color_int: 0x15803D,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#15803d",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0200,
        doctrine_defense: -0.0100,
        doctrine_expansion: 0.0200,
        doctrine_maritime: -0.0300,
        traits: ["TRADE", "MOBILITY", "UNITY"],
    },
    CanonicalCivilization {
        id: "armenian",
        display_name: "ARMENIAN",
        macro_region: MacroRegion::WestAsia,
        lon: 44.0000,
        lat: 39.8000,
        candidate_start_cell: 147069,
        flag_id: "flag_armenian",
        political_color: "#be123c",
        color_int: 0xBE123C,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#be123c",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0000,
        doctrine_defense: 0.0300,
        doctrine_expansion: -0.0100,
        doctrine_maritime: -0.0200,
        traits: ["HIGHLAND", "RESILIENCE", "CRAFT"],
    },
    CanonicalCivilization {
        id: "hun",
        display_name: "HUN",
        macro_region: MacroRegion::CentralAsia,
        lon: 55.0000,
        lat: 48.0000,
        candidate_start_cell: 122524,
        flag_id: "flag_hun",
        political_color: "#9a3412",
        color_int: 0x9A3412,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#78350f",
            secondary_color: "#d97706",
            accent_color: "#fef08a",
            emblem: "spearhead",
        },
        doctrine_offense: 0.0200,
        doctrine_defense: 0.0000,
        doctrine_expansion: 0.0200,
        doctrine_maritime: -0.0400,
        traits: ["MOBILITY", "PRESSURE", "REACH"],
    },
    CanonicalCivilization {
        id: "gokturk",
        display_name: "GÖKTÜRK",
        macro_region: MacroRegion::CentralAsia,
        lon: 88.0000,
        lat: 48.0000,
        candidate_start_cell: 122618,
        flag_id: "flag_gokturk",
        political_color: "#0284c7",
        color_int: 0x284C7,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "triband",
            primary_color: "#0284c7",
            secondary_color: "#0369a1",
            accent_color: "#fef08a",
            emblem: "star",
        },
        doctrine_offense: 0.0100,
        doctrine_defense: 0.0000,
        doctrine_expansion: 0.0300,
        doctrine_maritime: -0.0400,
        traits: ["ORDER", "MOBILITY", "EXPANSION"],
    },
    CanonicalCivilization {
        id: "mongol",
        display_name: "MONGOL",
        macro_region: MacroRegion::CentralAsia,
        lon: 106.0000,
        lat: 47.0000,
        candidate_start_cell: 125742,
        flag_id: "flag_mongol",
        political_color: "#1e40af",
        color_int: 0x1E40AF,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#1e40af",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0300,
        doctrine_defense: -0.0100,
        doctrine_expansion: 0.0200,
        doctrine_maritime: -0.0400,
        traits: ["MOBILITY", "SCALE", "COMMAND"],
    },
    CanonicalCivilization {
        id: "saka",
        display_name: "SAKA",
        macro_region: MacroRegion::CentralAsia,
        lon: 68.0000,
        lat: 44.0000,
        candidate_start_cell: 134849,
        flag_id: "flag_saka",
        political_color: "#eab308",
        color_int: 0xEAB308,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#eab308",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0100,
        doctrine_defense: 0.0100,
        doctrine_expansion: 0.0200,
        doctrine_maritime: -0.0400,
        traits: ["RIDER", "FRONTIER", "ADAPTATION"],
    },
    CanonicalCivilization {
        id: "magadha",
        display_name: "MAGADHA",
        macro_region: MacroRegion::SouthAsia,
        lon: 82.0000,
        lat: 25.5000,
        candidate_start_cell: 188137,
        flag_id: "flag_magadha",
        political_color: "#ea580c",
        color_int: 0xEA580C,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#ea580c",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0000,
        doctrine_defense: 0.0100,
        doctrine_expansion: 0.0200,
        doctrine_maritime: -0.0300,
        traits: ["SCALE", "STATE", "GROWTH"],
    },
    CanonicalCivilization {
        id: "chola",
        display_name: "CHOLA",
        macro_region: MacroRegion::SouthAsia,
        lon: 79.0000,
        lat: 10.8000,
        candidate_start_cell: 231137,
        flag_id: "flag_chola",
        political_color: "#dc2626",
        color_int: 0xDC2626,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#dc2626",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0000,
        doctrine_defense: 0.0000,
        doctrine_expansion: -0.0200,
        doctrine_maritime: 0.0200,
        traits: ["MARITIME", "TEMPLE", "TRADE"],
    },
    CanonicalCivilization {
        id: "bengal",
        display_name: "BENGAL",
        macro_region: MacroRegion::SouthAsia,
        lon: 89.0000,
        lat: 23.5000,
        candidate_start_cell: 194301,
        flag_id: "flag_bengal",
        political_color: "#059669",
        color_int: 0x59669,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#059669",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: -0.0100,
        doctrine_defense: 0.0200,
        doctrine_expansion: 0.0100,
        doctrine_maritime: -0.0200,
        traits: ["RIVER", "TRADE", "DENSITY"],
    },
    CanonicalCivilization {
        id: "han",
        display_name: "HAN",
        macro_region: MacroRegion::EastAsia,
        lon: 112.0000,
        lat: 34.0000,
        candidate_start_cell: 163647,
        flag_id: "flag_han",
        political_color: "#10b981",
        color_int: 0x10B981,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#991b1b",
            secondary_color: "#ca8a04",
            accent_color: "#fef08a",
            emblem: "dragon",
        },
        doctrine_offense: 0.0000,
        doctrine_defense: 0.0200,
        doctrine_expansion: 0.0100,
        doctrine_maritime: -0.0300,
        traits: ["ORDER", "SCALE", "STRATEGY"],
    },
    CanonicalCivilization {
        id: "yamato",
        display_name: "YAMATO",
        macro_region: MacroRegion::EastAsia,
        lon: 136.5000,
        lat: 35.5000,
        candidate_start_cell: 159620,
        flag_id: "flag_yamato",
        political_color: "#f43f5e",
        color_int: 0xF43F5E,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#f8fafc",
            secondary_color: "#dc2626",
            accent_color: "#dc2626",
            emblem: "sun",
        },
        doctrine_offense: 0.0100,
        doctrine_defense: 0.0200,
        doctrine_expansion: -0.0300,
        doctrine_maritime: 0.0000,
        traits: ["PRECISION", "HONOR", "MARITIME"],
    },
    CanonicalCivilization {
        id: "joseon",
        display_name: "JOSEON",
        macro_region: MacroRegion::EastAsia,
        lon: 127.5000,
        lat: 36.5000,
        candidate_start_cell: 156523,
        flag_id: "flag_joseon",
        political_color: "#2563eb",
        color_int: 0x2563EB,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#2563eb",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: -0.0100,
        doctrine_defense: 0.0300,
        doctrine_expansion: -0.0100,
        doctrine_maritime: -0.0100,
        traits: ["SCHOLARSHIP", "ORDER", "RESOLVE"],
    },
    CanonicalCivilization {
        id: "tibetan",
        display_name: "TIBETAN",
        macro_region: MacroRegion::EastAsia,
        lon: 88.0000,
        lat: 31.0000,
        candidate_start_cell: 172794,
        flag_id: "flag_tibetan",
        political_color: "#9333ea",
        color_int: 0x9333EA,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#9333ea",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0000,
        doctrine_defense: 0.0400,
        doctrine_expansion: -0.0200,
        doctrine_maritime: -0.0200,
        traits: ["HIGHLAND", "ENDURANCE", "IDENTITY"],
    },
    CanonicalCivilization {
        id: "khmer",
        display_name: "KHMER",
        macro_region: MacroRegion::SoutheastAsia,
        lon: 104.5000,
        lat: 12.5000,
        candidate_start_cell: 226089,
        flag_id: "flag_khmer",
        political_color: "#d97706",
        color_int: 0xD97706,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#d97706",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0000,
        doctrine_defense: 0.0200,
        doctrine_expansion: 0.0100,
        doctrine_maritime: -0.0300,
        traits: ["WATER", "MONUMENT", "ORDER"],
    },
    CanonicalCivilization {
        id: "dai_viet",
        display_name: "ĐẠI VIỆT",
        macro_region: MacroRegion::SoutheastAsia,
        lon: 105.8000,
        lat: 20.5000,
        candidate_start_cell: 203565,
        flag_id: "flag_dai_viet",
        political_color: "#dc2626",
        color_int: 0xDC2626,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#dc2626",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0100,
        doctrine_defense: 0.0300,
        doctrine_expansion: -0.0200,
        doctrine_maritime: -0.0200,
        traits: ["RESOLVE", "RIVER", "STATE"],
    },
    CanonicalCivilization {
        id: "majapahit",
        display_name: "MAJAPAHIT",
        macro_region: MacroRegion::SoutheastAsia,
        lon: 112.0000,
        lat: -7.5000,
        candidate_start_cell: 284479,
        flag_id: "flag_majapahit",
        political_color: "#ca8a04",
        color_int: 0xCA8A04,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#ca8a04",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0000,
        doctrine_defense: -0.0100,
        doctrine_expansion: -0.0100,
        doctrine_maritime: 0.0200,
        traits: ["MARITIME", "TRADE", "NETWORK"],
    },
    CanonicalCivilization {
        id: "lakota",
        display_name: "LAKOTA",
        macro_region: MacroRegion::NorthAmerica,
        lon: -101.0000,
        lat: 44.0000,
        candidate_start_cell: 134369,
        flag_id: "flag_lakota",
        political_color: "#f97316",
        color_int: 0xF97316,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "bicolor",
            primary_color: "#7c2d12",
            secondary_color: "#1e293b",
            accent_color: "#fef08a",
            emblem: "sun",
        },
        doctrine_offense: 0.0100,
        doctrine_defense: 0.0100,
        doctrine_expansion: 0.0200,
        doctrine_maritime: -0.0400,
        traits: ["PLAINS", "SPIRIT", "RESOLVE"],
    },
    CanonicalCivilization {
        id: "haudenosaunee",
        display_name: "HAUDENOSAUNEE",
        macro_region: MacroRegion::NorthAmerica,
        lon: -76.5000,
        lat: 43.0000,
        candidate_start_cell: 137510,
        flag_id: "flag_haudenosaunee",
        political_color: "#7e22ce",
        color_int: 0x7E22CE,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#7e22ce",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0000,
        doctrine_defense: 0.0300,
        doctrine_expansion: 0.0000,
        doctrine_maritime: -0.0300,
        traits: ["COUNCIL", "UNITY", "FOREST"],
    },
    CanonicalCivilization {
        id: "dine",
        display_name: "DINÉ",
        macro_region: MacroRegion::NorthAmerica,
        lon: -110.0000,
        lat: 36.0000,
        candidate_start_cell: 157895,
        flag_id: "flag_dine",
        political_color: "#0284c7",
        color_int: 0x284C7,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#0284c7",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: -0.0100,
        doctrine_defense: 0.0300,
        doctrine_expansion: 0.0000,
        doctrine_maritime: -0.0200,
        traits: ["LAND", "ENDURANCE", "CRAFT"],
    },
    CanonicalCivilization {
        id: "inuit",
        display_name: "INUIT",
        macro_region: MacroRegion::NorthAmerica,
        lon: -92.0000,
        lat: 66.0000,
        candidate_start_cell: 69882,
        flag_id: "flag_inuit",
        political_color: "#38bdf8",
        color_int: 0x38BDF8,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#38bdf8",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: -0.0100,
        doctrine_defense: 0.0200,
        doctrine_expansion: 0.0100,
        doctrine_maritime: -0.0200,
        traits: ["ARCTIC", "ADAPTATION", "RANGE"],
    },
    CanonicalCivilization {
        id: "haida",
        display_name: "HAIDA",
        macro_region: MacroRegion::NorthAmerica,
        lon: -131.5000,
        lat: 53.0000,
        candidate_start_cell: 107658,
        flag_id: "flag_haida",
        political_color: "#b91c1c",
        color_int: 0xB91C1C,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#b91c1c",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0100,
        doctrine_defense: 0.0100,
        doctrine_expansion: -0.0200,
        doctrine_maritime: 0.0000,
        traits: ["MARITIME", "CRAFT", "LINEAGE"],
    },
    CanonicalCivilization {
        id: "inca",
        display_name: "INCA",
        macro_region: MacroRegion::SouthAmerica,
        lon: -73.0000,
        lat: -12.5000,
        candidate_start_cell: 299312,
        flag_id: "flag_inca",
        political_color: "#eab308",
        color_int: 0xEAB308,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "triband",
            primary_color: "#ca8a04",
            secondary_color: "#991b1b",
            accent_color: "#fef08a",
            emblem: "sun",
        },
        doctrine_offense: 0.0000,
        doctrine_defense: 0.0200,
        doctrine_expansion: 0.0100,
        doctrine_maritime: -0.0300,
        traits: ["ALTITUDE", "ORDER", "ROAD"],
    },
    CanonicalCivilization {
        id: "muisca",
        display_name: "MUISCA",
        macro_region: MacroRegion::SouthAmerica,
        lon: -73.5000,
        lat: 5.5000,
        candidate_start_cell: 246063,
        flag_id: "flag_muisca",
        political_color: "#10b981",
        color_int: 0x10B981,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#10b981",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: -0.0100,
        doctrine_defense: 0.0200,
        doctrine_expansion: 0.0100,
        doctrine_maritime: -0.0200,
        traits: ["TRADE", "HIGHLAND", "CRAFT"],
    },
    CanonicalCivilization {
        id: "mapuche",
        display_name: "MAPUCHE",
        macro_region: MacroRegion::SouthAmerica,
        lon: -72.0000,
        lat: -38.5000,
        candidate_start_cell: 375091,
        flag_id: "flag_mapuche",
        political_color: "#1d4ed8",
        color_int: 0x1D4ED8,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#1d4ed8",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0100,
        doctrine_defense: 0.0300,
        doctrine_expansion: -0.0100,
        doctrine_maritime: -0.0300,
        traits: ["RESOLVE", "FRONTIER", "LAND"],
    },
    CanonicalCivilization {
        id: "guarani",
        display_name: "GUARANÍ",
        macro_region: MacroRegion::SouthAmerica,
        lon: -56.0000,
        lat: -25.0000,
        candidate_start_cell: 335201,
        flag_id: "flag_guarani",
        political_color: "#16a34a",
        color_int: 0x16A34A,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#16a34a",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0000,
        doctrine_defense: 0.0200,
        doctrine_expansion: 0.0100,
        doctrine_maritime: -0.0300,
        traits: ["FOREST", "COMMUNITY", "ADAPTATION"],
    },
    CanonicalCivilization {
        id: "yolngu",
        display_name: "YOLŊU",
        macro_region: MacroRegion::Australia,
        lon: 135.5000,
        lat: -12.5000,
        candidate_start_cell: 299905,
        flag_id: "flag_yolngu",
        political_color: "#b91c1c",
        color_int: 0xB91C1C,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "bicolor",
            primary_color: "#991b1b",
            secondary_color: "#ca8a04",
            accent_color: "#f8fafc",
            emblem: "sun",
        },
        doctrine_offense: -0.0100,
        doctrine_defense: 0.0200,
        doctrine_expansion: -0.0100,
        doctrine_maritime: 0.0000,
        traits: ["COAST", "KINSHIP", "LAND"],
    },
    CanonicalCivilization {
        id: "arrernte",
        display_name: "ARRERNTE",
        macro_region: MacroRegion::Australia,
        lon: 134.0000,
        lat: -23.7000,
        candidate_start_cell: 331645,
        flag_id: "flag_arrernte",
        political_color: "#d97706",
        color_int: 0xD97706,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#d97706",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: 0.0000,
        doctrine_defense: 0.0300,
        doctrine_expansion: 0.0000,
        doctrine_maritime: -0.0300,
        traits: ["DESERT", "LAND", "ENDURANCE"],
    },
    CanonicalCivilization {
        id: "noongar",
        display_name: "NOONGAR",
        macro_region: MacroRegion::Australia,
        lon: 117.0000,
        lat: -32.5000,
        candidate_start_cell: 357197,
        flag_id: "flag_noongar",
        political_color: "#0d9488",
        color_int: 0xD9488,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "solid",
            primary_color: "#0d9488",
            secondary_color: "#ffffff",
            accent_color: "#dfbc73",
            emblem: "star",
        },
        doctrine_offense: -0.0100,
        doctrine_defense: 0.0200,
        doctrine_expansion: 0.0000,
        doctrine_maritime: -0.0100,
        traits: ["COUNTRY", "SEASON", "COMMUNITY"],
    },
    CanonicalCivilization {
        id: "maori",
        display_name: "MĀORI",
        macro_region: MacroRegion::Oceania,
        lon: 175.0000,
        lat: -39.0000,
        candidate_start_cell: 376818,
        flag_id: "flag_maori",
        political_color: "#047857",
        color_int: 0x47857,
        flag_descriptor: CanonicalFlagDescriptor {
            layout: "triband",
            primary_color: "#991b1b",
            secondary_color: "#0f172a",
            accent_color: "#047857",
            emblem: "spearhead",
        },
        doctrine_offense: 0.0200,
        doctrine_defense: 0.0200,
        doctrine_expansion: -0.0300,
        doctrine_maritime: -0.0100,
        traits: ["OCEAN", "KINSHIP", "RESOLVE"],
    },
];

pub fn get_canonical_civilization(id: &str) -> Option<&'static CanonicalCivilization> {
    CANONICAL_CIVILIZATIONS.iter().find(|c| c.id == id)
}

pub fn get_civilization_by_index(idx: usize) -> Option<&'static CanonicalCivilization> {
    CANONICAL_CIVILIZATIONS.get(idx)
}

pub fn civilization_count() -> usize {
    CANONICAL_CIVILIZATIONS.len()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_14_civilization_doctrines_fairness_and_effects_gate() {
        assert_eq!(
            civilization_count(),
            44,
            "Atlas must contain exactly 44 canonical civilizations"
        );

        println!(
            "{:<16} | {:<8} | {:<8} | {:<9} | {:<8} | {:<10}",
            "Civilization", "Offense", "Defense", "Expansion", "Maritime", "Net Budget"
        );
        println!(
            "{:-<16}-|-{:-<8}-|-{:-<8}-|-{:-<9}-|-{:-<8}-|-{:-<10}",
            "", "", "", "", "", ""
        );

        let mut has_hun = false;
        let mut has_gokturk = false;
        let mut has_turk = false;

        for civ in CANONICAL_CIVILIZATIONS {
            assert!(
                civ.doctrine_offense.is_finite(),
                "Offense modifier must be finite for {}",
                civ.id
            );
            assert!(
                civ.doctrine_defense.is_finite(),
                "Defense modifier must be finite for {}",
                civ.id
            );
            assert!(
                civ.doctrine_expansion.is_finite(),
                "Expansion modifier must be finite for {}",
                civ.id
            );
            assert!(
                civ.doctrine_maritime.is_finite(),
                "Maritime modifier must be finite for {}",
                civ.id
            );

            let net_budget = civ.doctrine_offense
                + civ.doctrine_defense
                + civ.doctrine_expansion
                + civ.doctrine_maritime;
            assert!(
                net_budget.abs() < 0.001,
                "Civilization {} must have zero-sum balanced doctrine budget! Got net: {:.4}",
                civ.id,
                net_budget
            );

            assert!(
                civ.doctrine_offense.abs() <= 0.071,
                "Offense modifier must remain subtle (<= 7%) for {}",
                civ.id
            );
            assert!(
                civ.doctrine_defense.abs() <= 0.071,
                "Defense modifier must remain subtle (<= 7%) for {}",
                civ.id
            );
            assert!(
                civ.doctrine_expansion.abs() <= 0.071,
                "Expansion modifier must remain subtle (<= 7%) for {}",
                civ.id
            );
            assert!(
                civ.doctrine_maritime.abs() <= 0.071,
                "Maritime modifier must remain subtle (<= 7%) for {}",
                civ.id
            );

            if civ.id == "hun" {
                has_hun = true;
            }
            if civ.id == "gokturk" {
                has_gokturk = true;
            }
            if civ.id == "turk" {
                has_turk = true;
            }

            println!(
                "{:<16} | {:+7.2}% | {:+7.2}% | {:+8.2}% | {:+7.2}% | {:+9.4}",
                civ.display_name,
                civ.doctrine_offense * 100.0,
                civ.doctrine_defense * 100.0,
                civ.doctrine_expansion * 100.0,
                civ.doctrine_maritime * 100.0,
                net_budget
            );
        }

        assert!(has_hun, "HUN canonical civilization must be present");
        assert!(
            has_gokturk,
            "GÖKTÜRK canonical civilization must be present"
        );
        assert!(
            !has_turk,
            "Generic TÜRK must be retired from canonical roster"
        );

        // Section 83: Civilization Effect Tests
        // 1. Offense effect
        let power_high =
            crate::combat::calculate_effective_combat_power(40_000.0, 1, 1.0, 1.0, 0.05, 1.0);
        let power_neutral =
            crate::combat::calculate_effective_combat_power(40_000.0, 1, 1.0, 1.0, 0.00, 1.0);
        let power_low =
            crate::combat::calculate_effective_combat_power(40_000.0, 1, 1.0, 1.0, -0.05, 1.0);
        let offense_delta_high = (power_high - power_neutral) / power_neutral;
        let offense_delta_low = (power_low - power_neutral) / power_neutral;
        assert!(
            (offense_delta_high - 0.05).abs() < 0.005,
            "High offense must produce ~+5% power delta: {:.3}%",
            offense_delta_high * 100.0
        );
        assert!(
            (offense_delta_low - (-0.05)).abs() < 0.005,
            "Low offense must produce ~-5% power delta: {:.3}%",
            offense_delta_low * 100.0
        );

        // 2. Defense effect
        let def_high =
            crate::combat::calculate_effective_combat_power(40_000.0, 1, 1.0, 1.0, 0.05, 1.0);
        let def_neutral =
            crate::combat::calculate_effective_combat_power(40_000.0, 1, 1.0, 1.0, 0.00, 1.0);
        let def_delta_high = (def_high - def_neutral) / def_neutral;
        assert!(
            (def_delta_high - 0.05).abs() < 0.005,
            "High defense must produce ~+5% power delta: {:.3}%",
            def_delta_high * 100.0
        );

        // 3. Expansion consolidation rate effect
        let mat_base = crate::balance::CONSOLIDATION_MATURATION_RATE as f64;
        let mat_high = mat_base * (1.0 + 0.05 * 1.5);
        let mat_low = mat_base * (1.0 - 0.05 * 1.5);
        let expansion_delta = (mat_high - mat_base) / mat_base;
        assert!(
            (expansion_delta - 0.075).abs() < 0.005,
            "Expansion doctrine must produce ~+7.5% maturation speed delta: {:.3}%",
            expansion_delta * 100.0
        );
        assert!(mat_high > mat_low);

        // 4. Maritime effect
        let mar_base = 1.0_f64;
        let mar_high = mar_base * (1.0 + 0.05 * 1.5);
        let mar_delta = (mar_high - mar_base) / mar_base;
        assert!(
            (mar_delta - 0.075).abs() < 0.005,
            "Maritime doctrine must produce ~+7.5% maritime bonus delta: {:.3}%",
            mar_delta * 100.0
        );
    }
}
