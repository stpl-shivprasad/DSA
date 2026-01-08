export default [
    {
        files: ["visualizer/*.js"],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: "module",
            globals: {
                vis: "readonly",
                graphData: "readonly",
                document: "readonly",
                window: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                console: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "warn"
        }
    }
];
