import { createTheme, type MantineColorsTuple } from '@mantine/core';

const balticBlue: MantineColorsTuple = [
  "#edf5fd",
  "#dae7f4",
  "#afceec",
  "#81b3e5",
  "#5e9dde",
  "#498fdb",
  "#3d88da",
  "#3075c2",
  "#2668ae",
  "#145c9e"
];

export const theme = createTheme({
  colors: {
    balticBlue: balticBlue,
  },
  primaryColor: 'balticBlue',
  headings: {
    fontFamily: "Montserrat, sans-serif",
    sizes: {
        h1: {
            fontWeight: "800"
        },
        h2: {
            fontWeight: "600"
        },
        h3: {
            fontWeight: "600"
        },
        h4: {
            fontWeight: "600"
        },
        h5: {
            fontWeight: "400"
        },
    }
  }
});
