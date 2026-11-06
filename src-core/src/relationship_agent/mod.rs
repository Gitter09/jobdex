//! The personal relationship agent: goals, workflows, source-backed memory,
//! reviewed actions and a deterministic delivery loop.
//!
//! Deterministic Rust owns permissions, time, persistence and delivery. The model
//! only interprets intent, extracts sourced context and drafts text.

pub mod actions;
pub mod memory;
pub mod model;
pub mod models;
pub mod runner;
pub mod store;
pub mod workflows;

#[cfg(test)]
mod tests;

pub use model::{ModelClient, ModelFailure};
pub use models::*;
