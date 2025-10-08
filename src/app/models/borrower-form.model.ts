// src/app/models/borrower-form.model.ts

export interface BorrowerForm {
  // Shared project fields
  datePrevisionDeblocage: string;   // e.g. "01/10/2025"
  fraisCourtage: number;
  localisationBien: string;         // e.g. "METRO"
  periodicite: 'mensuel'|'trimestriel'|'semestriel'|'annuel';
  prelevementFraisCourtage: string; // e.g. "paiement_en_une_fois"
  type: string;                     // e.g. "RES1"
  typeReprise: string;              // e.g. "NouveauPret"

  // Single borrower
  emprunteur: {
    CodePostal: string;
    DateNaissance: string;
    DeplacementProSuperieur20: boolean;
    EnCoursTotalAssure: string;
    EstCoEmprunteur: boolean;
    EstExpatrie: boolean;
    EstFumeurDepuisDeuxAns: boolean;
    PortCharge: boolean;
    Profession: string;
    RisquePhysique: boolean;
    SituationExercice: string;
    TravailleEnHauteur: boolean;
  };

  // Single loan
  pret: {
    Differe: number;
    Duree: number;
    Montant: number;
    Numero: number;
    Taux: number;
    Type: string;
    TypeTaux: string;
  };

  // Single option set
  options: {
    AgeLimiteITT: number;
    Couverture: string;
    ExonerationCotisation: boolean;
    FranchiseITT: number;
    MauxDos: string;
    MiTempsTherapeutique: boolean;
    NumeroPret: number;
    PourCoEmprunteur: boolean;
    Psy: string;
    QuotiteDC: number;
    QuotiteIPP: number;
    QuotiteIPPRO: number;
    QuotiteITT: number;
    RemboursementInvalidite: string;
    TypeCouverture: string;
  };

  // APRIL-only fields (you can leave them blank if not calling APRIL)
  $type?: string;
  properties?: any;
  persons?: any[];
  loans?: any[];
  lenders?: any[];
  products?: any[];
  projectUuid?: string; // Project UUID for APRIL header

  // UTWIN-only top-level creds
  user?: string;
  password?: string;
  ref_produit?: string;
}
