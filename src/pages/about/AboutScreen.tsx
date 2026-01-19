import { Button } from "../../components/ui/Button";

interface AboutScreenProps {
    onBack: () => void;
}

export function AboutScreen({ onBack }: AboutScreenProps) {
    return (
        <div className="min-h-screen flex flex-col items-center p-8 bg-background transition-colors duration-200">
            {/* Header */}
            <div className="w-full max-w-3xl flex items-center mb-12 relative animate-fade-in">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="absolute left-0"
                >
                    ← Back
                </Button>

                <h1 className="flex-1 text-center text-xl font-serif text-primary">
                    About Gokan SRS
                </h1>
            </div>

            {/* Content */}
            <article className="w-full max-w-3xl space-y-12">
                {/* Introduction */}
                <section className="animate-slide-up">
                    <h2 className="text-lg font-serif text-primary mb-4">
                        Master Japanese Vocabulary with Spaced Repetition
                    </h2>
                    <p className="text-secondary leading-relaxed">
                        Gokan SRS is a free, straightforward Japanese vocabulary learning app designed for kanji learners who want to build a strong vocabulary repertoire. Using the proven spaced repetition system (SRS), you'll learn and retain Japanese words efficiently without unnecessary complexity.
                    </p>
                </section>

                {/* How It Works */}
                <section className="animate-slide-up" style={{ animationDelay: "100ms" }}>
                    <h2 className="text-lg font-serif text-primary mb-4">
                        How Gokan SRS Works
                    </h2>
                    <div className="space-y-4 text-secondary">
                        <div>
                            <h3 className="font-medium text-primary mb-2">1. Kanji-Based Vocabulary Learning</h3>
                            <p className="leading-relaxed">
                                Start by selecting your kanji knowledge level using KKLC or frequency-based methods. The app automatically generates vocabulary that matches your current kanji understanding, ensuring you learn words you can actually read.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-medium text-primary mb-2">2. Spaced Repetition System</h3>
                            <p className="leading-relaxed">
                                Review vocabulary at scientifically optimized intervals. Words you struggle with appear more frequently, while mastered words are reviewed less often. This maximizes retention while minimizing study time.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-medium text-primary mb-2">3. Simple, Focused Interface</h3>
                            <p className="leading-relaxed">
                                No distractions, no gamification gimmicks. Just you and the vocabulary. Study when you want, at your own pace, with a clean interface that respects your time.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-medium text-primary mb-2">4. Cloud Sync with Google Drive</h3>
                            <p className="leading-relaxed">
                                Your progress syncs automatically across devices using Google Drive. Study on your phone during commute, continue on your computer at home—your progress follows you everywhere.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Data Sources */}
                <section className="animate-slide-up" style={{ animationDelay: "150ms" }}>
                    <h2 className="text-lg font-serif text-primary mb-4">
                        Data Sources
                    </h2>
                    <p className="text-secondary leading-relaxed mb-4">
                        Gokan SRS uses high-quality, open-source Japanese language data to provide accurate and comprehensive vocabulary learning:
                    </p>
                    <ul className="space-y-3 text-secondary">
                        <li>
                            <strong className="text-primary">Vocabulary:</strong> Frequency-based vocabulary from{" "}
                            <a
                                href="https://jpdb.io"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline hover:no-underline"
                            >
                                JPDB
                            </a>
                            , ensuring you learn the most useful and common Japanese words first.
                        </li>
                        <li>
                            <strong className="text-primary">Definitions:</strong> Comprehensive word definitions and translations from{" "}
                            <a
                                href="https://www.edrdg.org/jmdict/j_jmdict.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline hover:no-underline"
                            >
                                JMDict
                            </a>
                            , the most widely-used Japanese-English dictionary database.
                        </li>
                    </ul>
                </section>

                {/* FAQ */}
                <section className="animate-slide-up" style={{ animationDelay: "200ms" }}>
                    <h2 className="text-lg font-serif text-primary mb-6">
                        Frequently Asked Questions
                    </h2>
                    <div className="space-y-6 text-secondary">
                        <div>
                            <h3 className="font-medium text-primary mb-2">Is Gokan SRS suitable for JLPT preparation?</h3>
                            <p className="leading-relaxed">
                                Yes! Gokan SRS uses frequency-based vocabulary and kanji progression, making it excellent for JLPT preparation at all levels. The spaced repetition system ensures you retain vocabulary long-term, which is crucial for exam success.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-medium text-primary mb-2">How is this different from other Japanese SRS apps?</h3>
                            <p className="leading-relaxed">
                                Gokan SRS focuses exclusively on vocabulary building for kanji learners. Unlike apps that try to teach everything, I specialize in one thing: helping you build a strong Japanese vocabulary repertoire efficiently. No grammar lessons, no kanji writing practice—just vocabulary, done right.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-medium text-primary mb-2">Do I need to know kanji before using this app?</h3>
                            <p className="leading-relaxed">
                                Yes, Gokan SRS is designed for learners who already have some kanji knowledge. You'll set your kanji level during setup, and the app will show you vocabulary that matches your current ability. This ensures you're learning words you can actually read and use.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-medium text-primary mb-2">Is Gokan SRS free?</h3>
                            <p className="leading-relaxed">
                                Yes, Gokan SRS is completely free to use. There are no premium features, no ads, and no hidden costs. I believe effective language learning tools should be accessible to everyone.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-medium text-primary mb-2">How much time should I spend studying each day?</h3>
                            <p className="leading-relaxed">
                                The beauty of spaced repetition is that you only review what's due. Most users spend 10-20 minutes per day. The app shows you exactly what needs review, so you're never wasting time on words you already know well.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-medium text-primary mb-2">Can I use this offline?</h3>
                            <p className="leading-relaxed">
                                Yes, once loaded, Gokan SRS works offline. Your progress is saved locally and syncs to Google Drive when you're back online. This makes it perfect for studying during commutes or in areas with poor connectivity.
                            </p>
                        </div>
                    </div>
                </section>
            </article>
        </div>
    );
}
