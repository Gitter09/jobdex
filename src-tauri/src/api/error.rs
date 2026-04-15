use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

#[derive(Debug)]
pub enum ApiError {
    NotFound(String),
    Validation(String),
    Database(String),
    #[allow(dead_code)]
    Unauthorized,
    #[allow(dead_code)]
    Forbidden,
    Internal(String),
}

#[derive(Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ApiErrorDetail>,
}

#[derive(Serialize)]
pub struct ApiErrorDetail {
    pub code: String,
    pub message: String,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        ApiResponse {
            ok: true,
            data: Some(data),
            error: None,
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            ApiError::NotFound(msg) => (StatusCode::NOT_FOUND, "NOT_FOUND", msg),
            ApiError::Validation(msg) => (StatusCode::BAD_REQUEST, "VALIDATION", msg),
            ApiError::Database(msg) => (StatusCode::INTERNAL_SERVER_ERROR, "DATABASE", msg),
            ApiError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                "UNAUTHORIZED",
                "Invalid or missing API key.".into(),
            ),
            ApiError::Forbidden => (
                StatusCode::FORBIDDEN,
                "FORBIDDEN",
                "API access is disabled.".into(),
            ),
            ApiError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL", msg),
        };

        #[cfg(debug_assertions)]
        eprintln!("[API Error] {} - {}: {}", status, code, message);

        let body = ApiResponse::<serde_json::Value> {
            ok: false,
            data: None,
            error: Some(ApiErrorDetail {
                code: code.to_string(),
                message,
            }),
        };
        (status, Json(body)).into_response()
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(e: sqlx::Error) -> Self {
        match e {
            sqlx::Error::RowNotFound => ApiError::NotFound("Resource not found.".into()),
            _ => ApiError::Database(e.to_string()),
        }
    }
}

impl From<AppError> for ApiError {
    fn from(e: AppError) -> Self {
        match e {
            AppError::Validation(msg) => ApiError::Validation(msg),
            AppError::Database(e) => ApiError::Database(e.to_string()),
            AppError::Network(msg) => ApiError::Internal(msg),
            AppError::Io(e) => ApiError::Internal(e.to_string()),
            AppError::Serialization(e) => ApiError::Internal(e.to_string()),
            AppError::Internal(msg) => ApiError::Internal(msg),
        }
    }
}

use crate::error::AppError;
