/**
 * Transcription Configuration Constants
 * These can be overridden via environment variables
 */

export const TRANSCRIPTION_CONFIG = {
    // Language code for transcription (default: en-US)
    DEFAULT_LANGUAGE: process.env.TRANSCRIPTION_LANGUAGE || 'en-US',

    // Polling configuration
    MAX_RETRIES: parseInt(process.env.TRANSCRIPTION_MAX_RETRIES || '60', 10),
    POLL_INTERVAL: parseInt(process.env.TRANSCRIPTION_POLL_INTERVAL || '5000', 10), // milliseconds
    MAX_POLL_TIME: parseInt(process.env.TRANSCRIPTION_MAX_POLL_TIME || '300000', 10), // 5 minutes in milliseconds
    EXPONENTIAL_BACKOFF_BASE: 5000, // Base delay in milliseconds
    EXPONENTIAL_BACKOFF_MAX: 30000, // Max delay in milliseconds
    EXPONENTIAL_BACKOFF_MULTIPLIER: 1.2,

    // Retry configuration for failed jobs
    MAX_RETRY_ATTEMPTS: parseInt(process.env.TRANSCRIPTION_MAX_RETRY_ATTEMPTS || '3', 10),
    RETRY_DELAY: parseInt(process.env.TRANSCRIPTION_RETRY_DELAY || '10000', 10), // 10 seconds

    // Cleanup configuration
    CLEANUP_DAYS: parseInt(process.env.TRANSCRIPTION_CLEANUP_DAYS || '30', 10),

    // Status update intervals (for user feedback)
    STATUS_UPDATE_INTERVAL: 12, // Update user every 12 polls (approximately 1 minute)

    // Network retry configuration
    NETWORK_MAX_RETRIES: 3,
    NETWORK_RETRY_DELAY: 5000, // 5 seconds
};

/**
 * AWS Transcribe supported language codes
 */
export const SUPPORTED_LANGUAGES = {
    'en-US': 'English (US)',
    'en-GB': 'English (UK)',
    'es-US': 'Spanish (US)',
    'fr-FR': 'French',
    'de-DE': 'German',
    'it-IT': 'Italian',
    'pt-BR': 'Portuguese (Brazil)',
    'ja-JP': 'Japanese',
    'ko-KR': 'Korean',
    'zh-CN': 'Chinese (Simplified)',
    'ar-SA': 'Arabic',
    'hi-IN': 'Hindi',
};

/**
 * Media formats supported by AWS Transcribe
 */
export const SUPPORTED_MEDIA_FORMATS = {
    'mp4': 'mp4',
    'webm': 'webm',
    'mov': 'mp4',
    'mp3': 'mp3',
    'wav': 'wav',
    'flac': 'flac',
    'ogg': 'ogg',
    'amr': 'amr',
    '3gp': '3gp',
};

/**
 * Transcription job statuses
 */
export const JOB_STATUS = {
    QUEUED: 'QUEUED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
};
