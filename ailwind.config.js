/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**What it does:** Tells Tailwind which files to scan for class names and uses NativeWind's preset for React Native compatibility.

---

## Your project structure should look like this:
```
