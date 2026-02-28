import kuromoji from 'kuromoji';

async function run() {
    const tokenizer = await new Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>>((resolve, reject) => {
        kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, t) => {
            if (err) reject(err);
            else resolve(t);
        });
    });

    const sentence = "文句を言って顰蹙をかいまくる。";
    const tokens = tokenizer.tokenize(sentence);
    console.log("TOKENS:");
    tokens.forEach(t => console.log(t.surface_form));

    console.log("\nSLIDING WINDOW:");
    for (let i = 0; i < tokens.length; i++) {
        let surfaceWindow = "";
        for (let j = 0; j < 5 && (i + j) < tokens.length; j++) {
            surfaceWindow += tokens[i + j].surface_form;
            console.log(`[${i}, ${j}]: ${surfaceWindow}`);
            if (surfaceWindow.endsWith("かい")) {
                console.log(`  -> Match candidate: ${surfaceWindow.slice(0, -2) + "かう"}`);
            }
        }
    }
}

run();
