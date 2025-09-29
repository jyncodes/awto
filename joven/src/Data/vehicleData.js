// src/data/vehicleData.js
const vehicleData = {
  Toyota: {
    Corolla: {
      Tire: [
        { size: "205/55R16", rimDiameter: "16", width: "205", aspectRatio: "55", boltPattern: "5x114.3", offset: "40" },
        { size: "215/45R17", rimDiameter: "17", width: "215", aspectRatio: "45", boltPattern: "5x114.3", offset: "42" }
      ],
      Wheel: [
        { size: "16x6.5", rimDiameter: "16", width: "6.5", boltPattern: "5x114.3", offset: "40" }
      ]
    },
    Camry: {
      Tire: [
        { size: "225/45R18", rimDiameter: "18", width: "225", aspectRatio: "45", boltPattern: "5x114.3", offset: "45" }
      ]
    }
  },
  Honda: {
    Civic: {
      Tire: [
        { size: "215/50R17", rimDiameter: "17", width: "215", aspectRatio: "50", boltPattern: "5x114.3", offset: "45" }
      ]
    }
  }
};

export default vehicleData;
