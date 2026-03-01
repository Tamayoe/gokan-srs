// Core barrel export
// All shared business logic — safe to import from both apps/web and apps/mobile

// Adapters (platform interfaces)
export type { StorageAdapter } from './adapters/storage.adapter';
export { localStorageAdapter } from './adapters/storage.adapter';
export type { FetchAdapter } from './adapters/fetch.adapter';
export { createWebFetchAdapter } from './adapters/fetch.adapter';

// Models
export type { Vocabulary, VocabProgress, SRSEntry, ReviewLog } from './models/vocabulary.model';
export type { UserProgress, UserSettings, KanjiKnowledge } from './models/user.model';
export type { Sentence, SentenceSet } from './models/sentence.model';
export type { KKLCIndex, KKLCKanjiIndex, FrequencyIndex } from './models/index.model';

// Services
export { SRSService } from './services/srs.service';
export type { AnswerResult } from './services/srs.service';
export { StorageService } from './services/storage.service';
export { VocabularyService } from './services/vocabulary.service';
export { MigrationService } from './services/migration.service';
export { LLMService } from './services/llm.service';
export { GoogleDriveSync, GoogleAuthError } from './services/google.service';
export type { SyncEnvelope } from './services/google.service';

// Utils
export { computeSessionView } from './utils/quiz.utils';
export { getNextVocabToStudy } from './utils/srs.utils';
export type { QuizItem, QuizType } from './utils/srs.utils';

// Constants
export { CONSTANTS } from './commons/constants';
