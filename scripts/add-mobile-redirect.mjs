import fs from 'fs';
const file = 'components/campaign-cockpit.tsx';
let content = fs.readFileSync(file, 'utf8');

const redirectCode = `
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      window.location.replace("/c");
    }
  }, []);
`;

content = content.replace('const [activeSection, setActiveSection] =', redirectCode + '\n  const [activeSection, setActiveSection] =');

fs.writeFileSync(file, content);
console.log("Done");
