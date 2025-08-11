const mongoose = require("mongoose");


const AccessInterface = {
  name: { type: String, required: true },
  ID: { type: String, required: true },
  password: { type: String, required: true }
};

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre del cliente es obligatorio."],
      trim: true,
      minlength: [2, "El nombre debe tener al menos 2 caracteres."],
    },
    common: {
      type: String,
      required: [true, "El código común es obligatorio."],
      unique: [true, "Ya existe un cliente con este numero"],
      match: [
        /^[0-9]{4}$/,
        "El código común debe tener exactamente 4 dígitos numéricos.",
      ],
    },
    lastUpdate: {
      type: Date,
      required: [true, "Debe indicar fecha de ultima actualización"],
      default: Date.now,
    },
    lastUpdateUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    vip: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    contactInfo: {
      emails: { type: [String], default: [] },
      phone: { type: String, default: null },
      address: { type: String, default: null },
    },
    access:{
      type: [AccessInterface]
    }
    ,
    config: {
      timezone: { type: String, default: "America/Argentina/Buenos_Aires" },
      preferredLanguage: { type: String, default: "es" },
    },
  },
  {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
  }
);

module.exports = mongoose.model("Client", clientSchema);
