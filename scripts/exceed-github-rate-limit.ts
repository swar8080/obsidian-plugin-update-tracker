async function main() {
    for (let i = 0; i < 60; i++) {
        const assetId = 39938488 + i;
        await new Promise((resolve) => setTimeout(resolve, 50));
        await fetch(
            `https://api.github.com/repos/erichalldev/obsidian-smart-random-note/releases/assets/${assetId}`,
            {
                method: 'GET',
                headers: new Headers({
                    Accept: 'application/octet-stream',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'cross-site',
                }),
            }
        ).then(console.log);
    }
}

main();
