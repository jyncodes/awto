const vehicleData = {
  Honda: {
    Brio: {
      Tire: [
        {
          size: "175/65R14",
          tireWidth: "175",
          aspectRatio: "65",
          radial: "R",
          rimDiameter: "14",
        },
        {
          size: "185/55R15",
          tireWidth: "185",
          aspectRatio: "55",
          radial: "R",
          rimDiameter: "15",
        },
      ],
      Wheel: [
        {
          size: "14x5.0",
          wheelDiameter: "14",
          wheelWidth: "5.0",
          boltPattern: "4x100",
          offset: "+45",
          centerBore: "56.1",
        },
        {
          size: "15x6.0",
          wheelDiameter: "15",
          wheelWidth: "6.0",
          boltPattern: "4x100",
          offset: "+45",
          centerBore: "56.1",
        },
      ],
    },

    City: {
      Tire: [
        { size: "175/65R15", tireWidth: "175", aspectRatio: "65", radial: "R", rimDiameter: "15" },
        { size: "185/55R16", tireWidth: "185", aspectRatio: "55", radial: "R", rimDiameter: "16" },
      ],
      Wheel: [
        { size: "15x5.5", wheelDiameter: "15", wheelWidth: "5.5", boltPattern: "4x100", offset: "+45", centerBore: "56.1" },
        { size: "16x6.0", wheelDiameter: "16", wheelWidth: "6.0", boltPattern: "4x100", offset: "+45", centerBore: "56.1" },
      ],
    },

    Civic: {
      Tire: [
        { size: "205/55R16", tireWidth: "205", aspectRatio: "55", radial: "R", rimDiameter: "16" },
        { size: "215/50R17", tireWidth: "215", aspectRatio: "50", radial: "R", rimDiameter: "17" },
        { size: "235/40R18", tireWidth: "235", aspectRatio: "40", radial: "R", rimDiameter: "18" },
      ],
      Wheel: [
        { size: "16x6.5", wheelDiameter: "16", wheelWidth: "6.5", boltPattern: "5x114.3", offset: "+45", centerBore: "64.1" },
        { size: "17x7.0", wheelDiameter: "17", wheelWidth: "7.0", boltPattern: "5x114.3", offset: "+45", centerBore: "64.1" },
        { size: "18x8.0", wheelDiameter: "18", wheelWidth: "8.0", boltPattern: "5x114.3", offset: "+45", centerBore: "64.1" },
      ],
    },

    Accord: {
      Tire: [
        { size: "215/55R17", tireWidth: "215", aspectRatio: "55", radial: "R", rimDiameter: "17" },
        { size: "235/45R18", tireWidth: "235", aspectRatio: "45", radial: "R", rimDiameter: "18" },
      ],
      Wheel: [
        { size: "17x7.5", wheelDiameter: "17", wheelWidth: "7.5", boltPattern: "5x114.3", offset: "+50", centerBore: "64.1" },
        { size: "18x8.0", wheelDiameter: "18", wheelWidth: "8.0", boltPattern: "5x114.3", offset: "+50", centerBore: "64.1" },
      ],
    },

    Jazz: {
      Tire: [
        { size: "175/65R15", tireWidth: "175", aspectRatio: "65", radial: "R", rimDiameter: "15" },
        { size: "185/55R16", tireWidth: "185", aspectRatio: "55", radial: "R", rimDiameter: "16" },
        { size: "175/55R15", tireWidth: "175", aspectRatio: "55", radial: "R", rimDiameter: "15" }, // ✅ Added example tire
      ],
      Wheel: [
        { size: "15x5.5", wheelDiameter: "15", wheelWidth: "5.5", boltPattern: "4x100", offset: "+45", centerBore: "56.1" },
        { size: "16x6.0", wheelDiameter: "16", wheelWidth: "6.0", boltPattern: "4x100", offset: "+45", centerBore: "56.1" },
      ],
    },

    CRV: {
      Tire: [
        { size: "215/65R16", tireWidth: "215", aspectRatio: "65", radial: "R", rimDiameter: "16" },
        { size: "225/65R17", tireWidth: "225", aspectRatio: "65", radial: "R", rimDiameter: "17" },
        { size: "235/60R18", tireWidth: "235", aspectRatio: "60", radial: "R", rimDiameter: "18" },
      ],
      Wheel: [
        { size: "16x6.5", wheelDiameter: "16", wheelWidth: "6.5", boltPattern: "5x114.3", offset: "+45", centerBore: "64.1" },
        { size: "17x7.0", wheelDiameter: "17", wheelWidth: "7.0", boltPattern: "5x114.3", offset: "+45", centerBore: "64.1" },
        { size: "18x7.5", wheelDiameter: "18", wheelWidth: "7.5", boltPattern: "5x114.3", offset: "+45", centerBore: "64.1" },
      ],
    },

    HRV: {
      Tire: [
        { size: "215/55R17", tireWidth: "215", aspectRatio: "55", radial: "R", rimDiameter: "17" },
        { size: "225/50R18", tireWidth: "225", aspectRatio: "50", radial: "R", rimDiameter: "18" },
      ],
      Wheel: [
        { size: "17x7.0", wheelDiameter: "17", wheelWidth: "7.0", boltPattern: "5x114.3", offset: "+45", centerBore: "64.1" },
        { size: "18x7.5", wheelDiameter: "18", wheelWidth: "7.5", boltPattern: "5x114.3", offset: "+45", centerBore: "64.1" },
      ],
    },

    BRV: {
      Tire: [
        { size: "195/60R16", tireWidth: "195", aspectRatio: "60", radial: "R", rimDiameter: "16" },
      ],
      Wheel: [
        { size: "16x6.0", wheelDiameter: "16", wheelWidth: "6.0", boltPattern: "5x114.3", offset: "+45", centerBore: "64.1" },
      ],
    },

    Mobilio: {
      Tire: [
        { size: "185/65R15", tireWidth: "185", aspectRatio: "65", radial: "R", rimDiameter: "15" },
      ],
      Wheel: [
        { size: "15x5.5", wheelDiameter: "15", wheelWidth: "5.5", boltPattern: "4x100", offset: "+45", centerBore: "56.1" },
      ],
    },

    Pilot: {
      Tire: [
        { size: "245/60R18", tireWidth: "245", aspectRatio: "60", radial: "R", rimDiameter: "18" },
        { size: "265/45R20", tireWidth: "265", aspectRatio: "45", radial: "R", rimDiameter: "20" },
      ],
      Wheel: [
        { size: "18x8.0", wheelDiameter: "18", wheelWidth: "8.0", boltPattern: "5x120", offset: "+55", centerBore: "64.1" },
        { size: "20x8.5", wheelDiameter: "20", wheelWidth: "8.5", boltPattern: "5x120", offset: "+55", centerBore: "64.1" },
      ],
    },
  },
};

export default vehicleData;
