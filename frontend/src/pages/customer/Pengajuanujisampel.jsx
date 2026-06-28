import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/api";
import { getCart, clearCart } from "../../utils/cart";
import { getUser } from "../../utils/auth";

/* ─── Konstanta dari Excel reference ─── */
const TYPE_SERVICE     = ["Reguler", "Cito", "Surveilans"];
const PURPOSE          = ["Surveilans", "Diagnosa", "Monitoring", "Penelitian", "Ekspor", "Impor", "Lainnya"];
const SAMPLE_MODELS    = ["Mamalia", "Unggas", "Rabies", "Model Lain"];
const UNIT_AGES        = ["hari", "minggu", "bulan", "tahun"];
const VACCINATED       = ["Ya", "Tidak", "Tidak Diketahui"];
const PRESERVATIVES    = ["Alkohol", "Aseton", "Beku", "Buffered Peptone Water (BPW)", "EDTA", "Formalin", "Garam", "Gliserin", "Heparin", "Methylparaben", "NaCl", "NaOH", "NBF 10%", "Nutrient Broth", "PBS", "Segar", "Tidak Diketahui", "Transport Medium", "Viral Transport Medium / VTM"];
const PACKAGES         = ["Botol Non-Steril", "Botol Steril", "Cawan Petri", "Egg Tray", "Hematokrit", "Kaleng", "Kantung Plastik", "Kardus", "Kotak Slide", "Microtube", "Pot Plastik", "Straw", "Tetrapack", "Tidak Ada Kemasan", "Tube"];
const SEXES_LIST       = ["betina", "jantan", "tidak diketahui"];
const LOCATION_TYPES   = ["Budidaya Ternak Perah", "Budidaya Unggas Petelur", "Gudang Berpendingin", "Gudang Kering", "Horse Riding School/Sekolah Berkuda", "Istal/Stable", "Kandang Komunal", "Kandang Pembibitan Sapi", "Kios Daging", "Pasar", "Pemukiman Warga", "Peternakan Ayam Broiler", "Peternakan Ayam Kampung", "Peternakan Ayam Petelur", "Peternakan Babi", "Peternakan Domba", "Peternakan Itik/Bebek", "Peternakan Kambing", "Peternakan Komersial", "Peternakan Mandiri", "Peternakan Sapi Perah", "Peternakan Sapi Potong", "Ritel", "Rumah Potong Hewan Babi", "Rumah Potong Hewan Ruminansia", "Rumah Potong Hewan Unggas", "Tempat Pemotongan Hewan (TPH)", "UPT Perbibitan", "Usaha Penampungan Susu", "Usaha Penanganan atau Pengolahan Madu", "Usaha Pencucian Sarang Burung Walet", "Usaha Pengolahan Daging", "Usaha Pengolahan Produk Pangan Asal Hewan", "Usaha Pengolahan Sarang Burung Walet", "Usaha Pengolahan Susu", "Usaha Pengolahan Telur", "Usaha Pengumpulan, Pengemasan, dan Pelabelan Telur Konsumsi", "Usaha Rumah Sarang Burung Walet"];
const SPECIMEN_GROUPS  = [{"id": 1, "name": "Hewan/Manusia", "kingdom": "hewan"}, {"id": 2, "name": "Produk asal hewan", "kingdom": "hewan"}, {"id": 3, "name": "Lainnya (Lingkungan, Pakan, Mineral, dll.)", "kingdom": "lainnya"}, {"id": 4, "name": "Isolat Bakteri", "kingdom": "bakteri"}, {"id": 5, "name": "Isolat Virus", "kingdom": "virus"}, {"id": 6, "name": "Isolat Fungi", "kingdom": "fungi"}];
const SPECIMENS        = [{"id": 146, "name": "Abomasum", "group_id": 1}, {"id": 66, "name": "Adrenal", "group_id": 1}, {"id": 87, "name": "Air susu", "group_id": 1}, {"id": 340, "name": "Ampela/Gizzard", "group_id": 1}, {"id": 122, "name": "Anus", "group_id": 1}, {"id": 402, "name": "Aorta", "group_id": 1}, {"id": 11, "name": "Bagian tubuh", "group_id": 1}, {"id": 8, "name": "Bangkai", "group_id": 1}, {"id": 349, "name": "Bekuan darah", "group_id": 1}, {"id": 278, "name": "Benda asing", "group_id": 1}, {"id": 168, "name": "Benih udang", "group_id": 1}, {"id": 438, "name": "Bilasan Preputium", "group_id": 1}, {"id": 461, "name": "Blok Parafin", "group_id": 1}, {"id": 376, "name": "Bronkus", "group_id": 1}, {"id": 169, "name": "Buffy coat", "group_id": 1}, {"id": 123, "name": "Bulu", "group_id": 1}, {"id": 57, "name": "Bursa fabricious", "group_id": 1}, {"id": 382, "name": "Burung kangkareng perut putih ", "group_id": 1}, {"id": 170, "name": "Cacing", "group_id": 1}, {"id": 27, "name": "Caecum", "group_id": 1}, {"id": 107, "name": "Cairan abdomen", "group_id": 1}, {"id": 396, "name": "Cairan abortus", "group_id": 1}, {"id": 171, "name": "Cairan abses", "group_id": 1}, {"id": 172, "name": "Cairan alantois", "group_id": 1}, {"id": 449, "name": "Cairan ambing", "group_id": 1}, {"id": 432, "name": "Cairan Eksudat", "group_id": 1}, {"id": 78, "name": "Cairan empedu", "group_id": 1}, {"id": 426, "name": "Cairan endometrium", "group_id": 1}, {"id": 145, "name": "Cairan fetus", "group_id": 1}, {"id": 109, "name": "Cairan hidung", "group_id": 1}, {"id": 108, "name": "Cairan jantung", "group_id": 1}, {"id": 174, "name": "Cairan lambung", "group_id": 1}, {"id": 73, "name": "Cairan lutut", "group_id": 1}, {"id": 110, "name": "Cairan odema", "group_id": 1}, {"id": 173, "name": "Cairan oesophagus", "group_id": 1}, {"id": 75, "name": "Cairan paru", "group_id": 1}, {"id": 175, "name": "Cairan peritonium", "group_id": 1}, {"id": 176, "name": "Cairan plasenta", "group_id": 1}, {"id": 177, "name": "Cairan rongga dada", "group_id": 1}, {"id": 178, "name": "Cairan rumen", "group_id": 1}, {"id": 179, "name": "Cairan sendi", "group_id": 1}, {"id": 371, "name": "Cairan serebrospinal", "group_id": 1}, {"id": 180, "name": "Cairan serosa", "group_id": 1}, {"id": 111, "name": "Cairan subcutan", "group_id": 1}, {"id": 72, "name": "Cairan sumsum tulang belakang", "group_id": 1}, {"id": 181, "name": "Cairan trakea", "group_id": 1}, {"id": 67, "name": "Cairan tubuh", "group_id": 1}, {"id": 182, "name": "Cairan uterus", "group_id": 1}, {"id": 112, "name": "Cairan vagina", "group_id": 1}, {"id": 74, "name": "Cairan vesikuler", "group_id": 1}, {"id": 183, "name": "Caplak", "group_id": 1}, {"id": 184, "name": "Colon", "group_id": 1}, {"id": 13, "name": "Dada", "group_id": 1}, {"id": 68, "name": "Darah", "group_id": 1}, {"id": 69, "name": "Darah utuh", "group_id": 1}, {"id": 385, "name": "Diafragma", "group_id": 1}, {"id": 187, "name": "DNA", "group_id": 1}, {"id": 188, "name": "Duodenum", "group_id": 1}, {"id": 464, "name": "ekor", "group_id": 1}, {"id": 83, "name": "Ekskreta", "group_id": 1}, {"id": 84, "name": "Ekskreta hidung", "group_id": 1}, {"id": 85, "name": "Ekskreta mata", "group_id": 1}, {"id": 86, "name": "Ekskreta mulut", "group_id": 1}, {"id": 422, "name": "Ekstrak limpa", "group_id": 1}, {"id": 421, "name": "Embrio", "group_id": 1}, {"id": 22, "name": "Esofagus", "group_id": 1}, {"id": 4, "name": "Feses", "group_id": 1}, {"id": 10, "name": "Fetus", "group_id": 1}, {"id": 460, "name": "Gigi anterior bawah", "group_id": 1}, {"id": 33, "name": "Ginjal", "group_id": 1}, {"id": 191, "name": "Gusi", "group_id": 1}, {"id": 29, "name": "Hati", "group_id": 1}, {"id": 408, "name": "Hepatopankreas", "group_id": 1}, {"id": 2, "name": "Hewan hidup", "group_id": 1}, {"id": 7, "name": "Hewan mati", "group_id": 1}, {"id": 18, "name": "Hidung", "group_id": 1}, {"id": 113, "name": "Hypocampus", "group_id": 1}, {"id": 192, "name": "Ileum ", "group_id": 1}, {"id": 193, "name": "Insang", "group_id": 1}, {"id": 35, "name": "Integumen", "group_id": 1}, {"id": 79, "name": "Isi lambung", "group_id": 1}, {"id": 80, "name": "Isi perut", "group_id": 1}, {"id": 115, "name": "Isi proventriculus", "group_id": 1}, {"id": 81, "name": "Isi rumen", "group_id": 1}, {"id": 76, "name": "Isi saluran pencernaan", "group_id": 1}, {"id": 114, "name": "Isi tembolok", "group_id": 1}, {"id": 82, "name": "Isi usus", "group_id": 1}, {"id": 194, "name": "Isi usus besar ", "group_id": 1}, {"id": 195, "name": "Isi usus halus", "group_id": 1}, {"id": 16, "name": "Jantung", "group_id": 1}, {"id": 196, "name": "Jaringan kulit", "group_id": 1}, {"id": 197, "name": "Jaringan lemak", "group_id": 1}, {"id": 198, "name": "Jaringan mata", "group_id": 1}, {"id": 448, "name": "Jaringan pankreas", "group_id": 1}, {"id": 199, "name": "Jaringan telinga", "group_id": 1}, {"id": 200, "name": "Jaringan tumor", "group_id": 1}, {"id": 390, "name": "Jaringan umbilikal", "group_id": 1}, {"id": 201, "name": "Jejunum", "group_id": 1}, {"id": 374, "name": "Jengger", "group_id": 1}, {"id": 203, "name": "Kaki", "group_id": 1}, {"id": 30, "name": "Kandung empedu", "group_id": 1}, {"id": 34, "name": "Kandung kemih", "group_id": 1}, {"id": 204, "name": "Karsinoma", "group_id": 1}, {"id": 205, "name": "Kelenjar mamae", "group_id": 1}, {"id": 206, "name": "Kelenjar mandibular", "group_id": 1}, {"id": 375, "name": "Kelopak mata", "group_id": 1}, {"id": 12, "name": "Kepala", "group_id": 1}, {"id": 207, "name": "Kerang", "group_id": 1}, {"id": 37, "name": "Kerokan kulit", "group_id": 1}, {"id": 208, "name": "Kerokan nodul", "group_id": 1}, {"id": 345, "name": "Kerokan rektum", "group_id": 1}, {"id": 38, "name": "Keropeng", "group_id": 1}, {"id": 31, "name": "Kloaka", "group_id": 1}, {"id": 431, "name": "Kotoran telinga", "group_id": 1}, {"id": 36, "name": "Kulit", "group_id": 1}, {"id": 209, "name": "Kutu", "group_id": 1}, {"id": 210, "name": "Lalat", "group_id": 1}, {"id": 23, "name": "Lambung", "group_id": 1}, {"id": 211, "name": "Larva", "group_id": 1}, {"id": 212, "name": "Lesi di rongga mulut", "group_id": 1}, {"id": 213, "name": "Lidah", "group_id": 1}, {"id": 49, "name": "Limfoglandula", "group_id": 1}, {"id": 389, "name": "Limfonodus poplitea", "group_id": 1}, {"id": 50, "name": "Limpa", "group_id": 1}, {"id": 77, "name": "Liur", "group_id": 1}, {"id": 51, "name": "Lymphnode", "group_id": 1}, {"id": 52, "name": "Lymphnode, mesenterial", "group_id": 1}, {"id": 53, "name": "Lymphnode, perifer", "group_id": 1}, {"id": 54, "name": "Lymphoglandula femoral", "group_id": 1}, {"id": 55, "name": "Lymphoglandula scapular", "group_id": 1}, {"id": 387, "name": "Mandibula", "group_id": 1}, {"id": 459, "name": "Maxilla", "group_id": 1}, {"id": 217, "name": "Mesenterium", "group_id": 1}, {"id": 218, "name": "Moluska", "group_id": 1}, {"id": 117, "name": "Muntahan", "group_id": 1}, {"id": 71, "name": "Nanah", "group_id": 1}, {"id": 423, "name": "Nervus Ischiadicus", "group_id": 1}, {"id": 219, "name": "Nyamuk", "group_id": 1}, {"id": 149, "name": "Omasum", "group_id": 1}, {"id": 14, "name": "Organ", "group_id": 1}, {"id": 220, "name": "Oropharing", "group_id": 1}, {"id": 59, "name": "Otak", "group_id": 1}, {"id": 118, "name": "Otak besar", "group_id": 1}, {"id": 62, "name": "Otot", "group_id": 1}, {"id": 46, "name": "Ovarium", "group_id": 1}, {"id": 463, "name": "Oviduk", "group_id": 1}, {"id": 119, "name": "Paha", "group_id": 1}, {"id": 120, "name": "Pankreas", "group_id": 1}, {"id": 20, "name": "Paru", "group_id": 1}, {"id": 409, "name": "Pembuluh darah vena", "group_id": 1}, {"id": 221, "name": "Penis", "group_id": 1}, {"id": 378, "name": "Pipi", "group_id": 1}, {"id": 48, "name": "Placenta", "group_id": 1}, {"id": 354, "name": "Plasma", "group_id": 1}, {"id": 275, "name": "Praeputium wash", "group_id": 1}, {"id": 344, "name": "Probang", "group_id": 1}, {"id": 222, "name": "Proventiculus", "group_id": 1}, {"id": 223, "name": "Pundak", "group_id": 1}, {"id": 224, "name": "Pus keropeng", "group_id": 1}, {"id": 39, "name": "Rambut", "group_id": 1}, {"id": 148, "name": "Retikulum", "group_id": 1}, {"id": 225, "name": "Rna", "group_id": 1}, {"id": 147, "name": "Rumen", "group_id": 1}, {"id": 353, "name": "Sekum", "group_id": 1}, {"id": 229, "name": "Selaput otak", "group_id": 1}, {"id": 230, "name": "Semen", "group_id": 1}, {"id": 377, "name": "Sendi kaki", "group_id": 1}, {"id": 70, "name": "Serum", "group_id": 1}, {"id": 19, "name": "Sinus", "group_id": 1}, {"id": 234, "name": "Sirip", "group_id": 1}, {"id": 235, "name": "Sisik", "group_id": 1}, {"id": 65, "name": "Sistem endokrin", "group_id": 1}, {"id": 28, "name": "Sistem hepatik", "group_id": 1}, {"id": 32, "name": "Sistem kemih", "group_id": 1}, {"id": 61, "name": "Sistem muskuloskeletal", "group_id": 1}, {"id": 21, "name": "Sistem pencernaan", "group_id": 1}, {"id": 15, "name": "Sistem peredaran darah", "group_id": 1}, {"id": 17, "name": "Sistem pernapasan", "group_id": 1}, {"id": 41, "name": "Sistem reproduksi", "group_id": 1}, {"id": 44, "name": "Sistem reproduksi betina", "group_id": 1}, {"id": 42, "name": "Sistem reproduksi jantan", "group_id": 1}, {"id": 236, "name": "Slide histopatologi", "group_id": 1}, {"id": 237, "name": "Slide nanah/jaringan", "group_id": 1}, {"id": 238, "name": "Slide otak", "group_id": 1}, {"id": 239, "name": "Slide rabies (PST)", "group_id": 1}, {"id": 88, "name": "Sperma", "group_id": 1}, {"id": 429, "name": "Sputum", "group_id": 1}, {"id": 64, "name": "Sumsum tulang", "group_id": 1}, {"id": 60, "name": "Sumsum tulang belakang", "group_id": 1}, {"id": 240, "name": "Supernatan", "group_id": 1}, {"id": 403, "name": "Suspensi", "group_id": 1}, {"id": 410, "name": "Suspensi daging", "group_id": 1}, {"id": 405, "name": "Suspensi darah", "group_id": 1}, {"id": 404, "name": "Suspensi jaringan", "group_id": 1}, {"id": 307, "name": "Suspensi organ", "group_id": 1}, {"id": 58, "name": "Susunan saraf", "group_id": 1}, {"id": 241, "name": "Swab", "group_id": 1}, {"id": 242, "name": "Swab ambing", "group_id": 1}, {"id": 243, "name": "Swab anus", "group_id": 1}, {"id": 443, "name": "Swab Jantung", "group_id": 1}, {"id": 244, "name": "Swab kloaka", "group_id": 1}, {"id": 249, "name": "Swab lesi", "group_id": 1}, {"id": 453, "name": "Swab liver", "group_id": 1}, {"id": 251, "name": "Swab luka", "group_id": 1}, {"id": 252, "name": "Swab mata", "group_id": 1}, {"id": 256, "name": "Swab mukus", "group_id": 1}, {"id": 257, "name": "Swab nasal", "group_id": 1}, {"id": 258, "name": "Swab nasopharing", "group_id": 1}, {"id": 259, "name": "Swab nodul", "group_id": 1}, {"id": 317, "name": "Swab oral", "group_id": 1}, {"id": 384, "name": "Swab orofaring", "group_id": 1}, {"id": 442, "name": "Swab Paru", "group_id": 1}, {"id": 264, "name": "Swab puting", "group_id": 1}, {"id": 401, "name": "Swab rectum", "group_id": 1}, {"id": 265, "name": "Swab tangan", "group_id": 1}, {"id": 5, "name": "Swab trakea", "group_id": 1}, {"id": 266, "name": "Swab vagina", "group_id": 1}, {"id": 40, "name": "Telinga", "group_id": 1}, {"id": 420, "name": "Terumbu karang", "group_id": 1}, {"id": 43, "name": "Testis", "group_id": 1}, {"id": 322, "name": "Tidak diketahui", "group_id": 1}, {"id": 56, "name": "Tonsil", "group_id": 1}, {"id": 268, "name": "Trakea", "group_id": 1}, {"id": 424, "name": "Tuba falopi", "group_id": 1}, {"id": 63, "name": "Tulang", "group_id": 1}, {"id": 269, "name": "Tulang lutut", "group_id": 1}, {"id": 270, "name": "Ulas darah", "group_id": 1}, {"id": 271, "name": "Ulas darah tebal", "group_id": 1}, {"id": 272, "name": "Ulas nasal", "group_id": 1}, {"id": 454, "name": "Ulas Organ", "group_id": 1}, {"id": 260, "name": "Ulas oropharing", "group_id": 1}, {"id": 89, "name": "Urine", "group_id": 1}, {"id": 24, "name": "Usus", "group_id": 1}, {"id": 26, "name": "Usus besar", "group_id": 1}, {"id": 25, "name": "Usus kecil", "group_id": 1}, {"id": 47, "name": "Uterus", "group_id": 1}, {"id": 6, "name": "Utuh", "group_id": 1}, {"id": 45, "name": "Vagina", "group_id": 1}, {"id": 273, "name": "Vagina wash", "group_id": 1}, {"id": 444, "name": "Yolk Sac", "group_id": 1}, {"id": 126, "name": "Abon", "group_id": 2}, {"id": 274, "name": "Adonan", "group_id": 2}, {"id": 158, "name": "Adonan bakso", "group_id": 2}, {"id": 340, "name": "Ampela/Gizzard", "group_id": 2}, {"id": 277, "name": "Amplang", "group_id": 2}, {"id": 402, "name": "Aorta", "group_id": 2}, {"id": 167, "name": "Bahan pakan", "group_id": 2}, {"id": 129, "name": "Bakso", "group_id": 2}, {"id": 334, "name": "Blood meal", "group_id": 2}, {"id": 347, "name": "Bone grist", "group_id": 2}, {"id": 332, "name": "Bone meal", "group_id": 2}, {"id": 351, "name": "Bristle", "group_id": 2}, {"id": 139, "name": "Burger", "group_id": 2}, {"id": 466, "name": "Ceker Ayam", "group_id": 2}, {"id": 131, "name": "Corned beef dalam kaleng/sosis dalam kaleng", "group_id": 2}, {"id": 416, "name": "Dada fillet tanpa kulit", "group_id": 2}, {"id": 1, "name": "Daging", "group_id": 2}, {"id": 93, "name": "Daging beku", "group_id": 2}, {"id": 141, "name": "Daging beku cincang", "group_id": 2}, {"id": 9, "name": "Daging beku karkas", "group_id": 2}, {"id": 140, "name": "Daging beku tanpa tulang", "group_id": 2}, {"id": 337, "name": "Daging giling", "group_id": 2}, {"id": 185, "name": "Daging ham", "group_id": 2}, {"id": 447, "name": "Daging kering beku", "group_id": 2}, {"id": 91, "name": "Daging mentah", "group_id": 2}, {"id": 186, "name": "Daging rendang", "group_id": 2}, {"id": 425, "name": "Daging Sapi Asap", "group_id": 2}, {"id": 124, "name": "Daging segar", "group_id": 2}, {"id": 144, "name": "Daging segar cincang", "group_id": 2}, {"id": 142, "name": "Daging segar karkas", "group_id": 2}, {"id": 143, "name": "Daging segar tanpa tulang", "group_id": 2}, {"id": 100, "name": "Dangke", "group_id": 2}, {"id": 92, "name": "Dendeng", "group_id": 2}, {"id": 464, "name": "ekor", "group_id": 2}, {"id": 283, "name": "Ekstrak", "group_id": 2}, {"id": 189, "name": "Ekstrak bakso", "group_id": 2}, {"id": 190, "name": "Ekstrak daging", "group_id": 2}, {"id": 355, "name": "Ekstrak kornet", "group_id": 2}, {"id": 415, "name": "Ekstrak nugget", "group_id": 2}, {"id": 357, "name": "Ekstrak sosis", "group_id": 2}, {"id": 356, "name": "Ekstrak telur", "group_id": 2}, {"id": 338, "name": "Es krim", "group_id": 2}, {"id": 335, "name": "Feather meal", "group_id": 2}, {"id": 348, "name": "Gelatin", "group_id": 2}, {"id": 29, "name": "Hati", "group_id": 2}, {"id": 312, "name": "Hemato basis ", "group_id": 2}, {"id": 313, "name": "Hemato basis merah", "group_id": 2}, {"id": 314, "name": "Hemato nugget", "group_id": 2}, {"id": 315, "name": "Hemato sosis", "group_id": 2}, {"id": 316, "name": "Hemato sosis merah", "group_id": 2}, {"id": 441, "name": "Ikan Tuna dalam kaleng", "group_id": 2}, {"id": 16, "name": "Jantung", "group_id": 2}, {"id": 374, "name": "Jengger", "group_id": 2}, {"id": 202, "name": "Jeroan", "group_id": 2}, {"id": 203, "name": "Kaki", "group_id": 2}, {"id": 395, "name": "Kefir", "group_id": 2}, {"id": 135, "name": "Keju", "group_id": 2}, {"id": 419, "name": "Kepala - Leher", "group_id": 2}, {"id": 137, "name": "Keripik usus ayam", "group_id": 2}, {"id": 127, "name": "Kerupuk kulit", "group_id": 2}, {"id": 128, "name": "Kerupuk paru", "group_id": 2}, {"id": 116, "name": "Kikil", "group_id": 2}, {"id": 414, "name": "Kornet", "group_id": 2}, {"id": 134, "name": "Krim", "group_id": 2}, {"id": 36, "name": "Kulit", "group_id": 2}, {"id": 295, "name": "Kultur jaringan", "group_id": 2}, {"id": 342, "name": "Lemak", "group_id": 2}, {"id": 213, "name": "Lidah", "group_id": 2}, {"id": 350, "name": "Madu", "group_id": 2}, {"id": 387, "name": "Mandibula", "group_id": 2}, {"id": 333, "name": "Meat bone meal", "group_id": 2}, {"id": 341, "name": "Mechanically deboned meat (MDM)", "group_id": 2}, {"id": 391, "name": "Mentega", "group_id": 2}, {"id": 125, "name": "Nuget", "group_id": 2}, {"id": 392, "name": "Olahan sarang hewan", "group_id": 2}, {"id": 339, "name": "Olahan susu", "group_id": 2}, {"id": 383, "name": "Olahan telur", "group_id": 2}, {"id": 417, "name": "Paha fillet tanpa kulit", "group_id": 2}, {"id": 336, "name": "Poultry byproduct meal", "group_id": 2}, {"id": 90, "name": "Produk", "group_id": 2}, {"id": 94, "name": "Produk olahan daging", "group_id": 2}, {"id": 96, "name": "Produk olahan daging dihaluskan", "group_id": 2}, {"id": 95, "name": "Produk olahan daging utuh/potongan", "group_id": 2}, {"id": 303, "name": "Sarang walet", "group_id": 2}, {"id": 226, "name": "Sate", "group_id": 2}, {"id": 353, "name": "Sekum", "group_id": 2}, {"id": 232, "name": "Siomay", "group_id": 2}, {"id": 138, "name": "Sosis", "group_id": 2}, {"id": 130, "name": "Sosis masak/tidak dikalengkan", "group_id": 2}, {"id": 411, "name": "Steamed bone meal", "group_id": 2}, {"id": 240, "name": "Supernatan", "group_id": 2}, {"id": 386, "name": "Supernatan bakso", "group_id": 2}, {"id": 343, "name": "Supernatan daging", "group_id": 2}, {"id": 410, "name": "Suspensi daging", "group_id": 2}, {"id": 412, "name": "Suspensi telur", "group_id": 2}, {"id": 97, "name": "Susu", "group_id": 2}, {"id": 346, "name": "Susu bubuk", "group_id": 2}, {"id": 132, "name": "Susu fermentasi (yoghurt)", "group_id": 2}, {"id": 133, "name": "Susu kental (skim, kental manis, krimer)", "group_id": 2}, {"id": 439, "name": "Susu mentah", "group_id": 2}, {"id": 121, "name": "Susu pasteurisasi", "group_id": 2}, {"id": 98, "name": "Susu segar", "group_id": 2}, {"id": 101, "name": "Susu steril/UHT", "group_id": 2}, {"id": 436, "name": "Swab Daging", "group_id": 2}, {"id": 437, "name": "Swab Karkas", "group_id": 2}, {"id": 445, "name": "Swab Telur", "group_id": 2}, {"id": 102, "name": "Telur", "group_id": 2}, {"id": 267, "name": "Telur asin", "group_id": 2}, {"id": 322, "name": "Tidak diketahui", "group_id": 2}, {"id": 369, "name": "Usus", "group_id": 2}, {"id": 136, "name": "Whey", "group_id": 2}, {"id": 372, "name": "Acar", "group_id": 3}, {"id": 3, "name": "Air", "group_id": 3}, {"id": 165, "name": "Air basuh", "group_id": 3}, {"id": 434, "name": "Air laut", "group_id": 3}, {"id": 380, "name": "Air limbah", "group_id": 3}, {"id": 166, "name": "Air sumur", "group_id": 3}, {"id": 276, "name": "Ampas tahu", "group_id": 3}, {"id": 106, "name": "Batu", "group_id": 3}, {"id": 470, "name": "Bawang Merah", "group_id": 3}, {"id": 471, "name": "Bawang Putih", "group_id": 3}, {"id": 373, "name": "Bilasan bulu bebek", "group_id": 3}, {"id": 438, "name": "Bilasan Preputium", "group_id": 3}, {"id": 334, "name": "Blood meal", "group_id": 3}, {"id": 332, "name": "Bone meal", "group_id": 3}, {"id": 433, "name": "Bubuk Jamur", "group_id": 3}, {"id": 279, "name": "Butiran  pada makanan", "group_id": 3}, {"id": 280, "name": "Cairan fermentasi", "group_id": 3}, {"id": 418, "name": "Cairan glukomanan", "group_id": 3}, {"id": 318, "name": "Celemek", "group_id": 3}, {"id": 281, "name": "Dadih", "group_id": 3}, {"id": 282, "name": "Dedak", "group_id": 3}, {"id": 283, "name": "Ekstrak", "group_id": 3}, {"id": 284, "name": "Ekstrak daun", "group_id": 3}, {"id": 285, "name": "Ekstrak desinfektan", "group_id": 3}, {"id": 430, "name": "Ektoparasit", "group_id": 3}, {"id": 338, "name": "Es krim", "group_id": 3}, {"id": 335, "name": "Feather meal", "group_id": 3}, {"id": 286, "name": "Fermentasi nenas", "group_id": 3}, {"id": 287, "name": "Garam", "group_id": 3}, {"id": 319, "name": "Ginseng", "group_id": 3}, {"id": 288, "name": "Hijauan", "group_id": 3}, {"id": 290, "name": "Jagung", "group_id": 3}, {"id": 320, "name": "Jambu monyet", "group_id": 3}, {"id": 291, "name": "Jamu ginseng", "group_id": 3}, {"id": 468, "name": "Jamur", "group_id": 3}, {"id": 451, "name": "Jelly", "group_id": 3}, {"id": 292, "name": "Kain lap", "group_id": 3}, {"id": 154, "name": "Kain lap basah", "group_id": 3}, {"id": 293, "name": "Kecap", "group_id": 3}, {"id": 427, "name": "Kertas alas DOC", "group_id": 3}, {"id": 294, "name": "Konsentrat", "group_id": 3}, {"id": 321, "name": "Labu air", "group_id": 3}, {"id": 214, "name": "Limbah cair", "group_id": 3}, {"id": 103, "name": "Lingkungan", "group_id": 3}, {"id": 105, "name": "Litter", "group_id": 3}, {"id": 215, "name": "Lumpur pome", "group_id": 3}, {"id": 296, "name": "Lumut hati", "group_id": 3}, {"id": 297, "name": "Makanan", "group_id": 3}, {"id": 467, "name": "Marshmallow", "group_id": 3}, {"id": 333, "name": "Meat bone meal", "group_id": 3}, {"id": 452, "name": "Media Tissue Culture", "group_id": 3}, {"id": 323, "name": "Meja", "group_id": 3}, {"id": 150, "name": "Meja pajangan karkas", "group_id": 3}, {"id": 153, "name": "Meja pemrosesan", "group_id": 3}, {"id": 324, "name": "Mesin cut up", "group_id": 3}, {"id": 155, "name": "Mesin pencabut bulu", "group_id": 3}, {"id": 298, "name": "Mineral", "group_id": 3}, {"id": 325, "name": "Nenas", "group_id": 3}, {"id": 407, "name": "Nutrient broth", "group_id": 3}, {"id": 299, "name": "Pakan hewan", "group_id": 3}, {"id": 326, "name": "Payau", "group_id": 3}, {"id": 440, "name": "Pet Food", "group_id": 3}, {"id": 327, "name": "Pisau", "group_id": 3}, {"id": 388, "name": "Plastik", "group_id": 3}, {"id": 397, "name": "Polyp karang", "group_id": 3}, {"id": 336, "name": "Poultry byproduct meal", "group_id": 3}, {"id": 300, "name": "Premix", "group_id": 3}, {"id": 406, "name": "Probiotik", "group_id": 3}, {"id": 301, "name": "Pupuk", "group_id": 3}, {"id": 302, "name": "Rumput", "group_id": 3}, {"id": 394, "name": "Rumput laut glacilaria", "group_id": 3}, {"id": 328, "name": "Salak", "group_id": 3}, {"id": 304, "name": "Saus tomat", "group_id": 3}, {"id": 370, "name": "Sediaan obat cair", "group_id": 3}, {"id": 227, "name": "Sedimen danau", "group_id": 3}, {"id": 305, "name": "Sedimen sungai", "group_id": 3}, {"id": 228, "name": "Sedimen sungai", "group_id": 3}, {"id": 469, "name": "Seledri", "group_id": 3}, {"id": 450, "name": "Serbuk batang pohon Kenaf", "group_id": 3}, {"id": 306, "name": "Skim kelapa", "group_id": 3}, {"id": 411, "name": "Steamed bone meal", "group_id": 3}, {"id": 241, "name": "Swab", "group_id": 3}, {"id": 365, "name": "Swab apron", "group_id": 3}, {"id": 428, "name": "Swab boot", "group_id": 3}, {"id": 246, "name": "Swab ember", "group_id": 3}, {"id": 393, "name": "Swab kandang", "group_id": 3}, {"id": 367, "name": "Swab keranjang", "group_id": 3}, {"id": 247, "name": "Swab lantai ante mortem", "group_id": 3}, {"id": 248, "name": "Swab lantai post mortem", "group_id": 3}, {"id": 250, "name": "Swab lingkungan", "group_id": 3}, {"id": 245, "name": "Swab litter kandang", "group_id": 3}, {"id": 253, "name": "Swab meja", "group_id": 3}, {"id": 254, "name": "Swab meja ante mortem", "group_id": 3}, {"id": 400, "name": "Swab meja parting", "group_id": 3}, {"id": 255, "name": "Swab meja post mortem", "group_id": 3}, {"id": 359, "name": "Swab mesin ground meat", "group_id": 3}, {"id": 399, "name": "Swab mesin parting", "group_id": 3}, {"id": 363, "name": "Swab pakaian kerja", "group_id": 3}, {"id": 261, "name": "Swab peralatan", "group_id": 3}, {"id": 262, "name": "Swab peralatan  ante mortem", "group_id": 3}, {"id": 263, "name": "Swab peralatan  post mortem", "group_id": 3}, {"id": 361, "name": "Swab pisau", "group_id": 3}, {"id": 364, "name": "Swab ruangan / kamar (room)", "group_id": 3}, {"id": 366, "name": "Swab sarung tangan (gloves)", "group_id": 3}, {"id": 358, "name": "Swab talenan", "group_id": 3}, {"id": 265, "name": "Swab tangan", "group_id": 3}, {"id": 446, "name": "Swab tempat makan/minum", "group_id": 3}, {"id": 360, "name": "Swab timbangan", "group_id": 3}, {"id": 398, "name": "Swab tumbler", "group_id": 3}, {"id": 362, "name": "Swab wipper", "group_id": 3}, {"id": 308, "name": "Swill feeding", "group_id": 3}, {"id": 104, "name": "Tanah", "group_id": 3}, {"id": 329, "name": "Tangan karyawan", "group_id": 3}, {"id": 330, "name": "Telenan", "group_id": 3}, {"id": 413, "name": "Tepung", "group_id": 3}, {"id": 322, "name": "Tidak diketahui", "group_id": 3}, {"id": 331, "name": "Timbangan", "group_id": 3}, {"id": 309, "name": "Ubi kayu", "group_id": 3}, {"id": 310, "name": "Ujung padi", "group_id": 3}, {"id": 311, "name": "Vaksin", "group_id": 3}, {"id": 151, "name": "Wadah karkas", "group_id": 3}, {"id": 152, "name": "Wadah limbah", "group_id": 3}, {"id": 456, "name": "Escherichia hermannii", "group_id": 4}, {"id": 289, "name": "Isolat", "group_id": 4}, {"id": 156, "name": "Isolat bakteri", "group_id": 4}, {"id": 379, "name": "Pasteurella multocida", "group_id": 4}, {"id": 455, "name": "Staphylococcus warneri", "group_id": 4}, {"id": 322, "name": "Tidak diketahui", "group_id": 4}, {"id": 289, "name": "Isolat", "group_id": 5}, {"id": 157, "name": "Isolat virus", "group_id": 5}, {"id": 322, "name": "Tidak diketahui", "group_id": 5}, {"id": 311, "name": "Vaksin", "group_id": 5}, {"id": 457, "name": "Isolat Kapang & Khamir", "group_id": 6}];
const ANIMALS          = [{"id": 654, "name": "Acinetobacter", "kingdom": "bakteri"}, {"id": 621, "name": "Bacillus anthracis", "kingdom": "bakteri"}, {"id": 632, "name": "Bacillus sp.", "kingdom": "bakteri"}, {"id": 416, "name": "Brucella sp.", "kingdom": "bakteri"}, {"id": 417, "name": "Campylobacter sp.", "kingdom": "bakteri"}, {"id": 678, "name": "Chromobacterium sp.", "kingdom": "bakteri"}, {"id": 679, "name": "Corynebacterium sp.", "kingdom": "bakteri"}, {"id": 634, "name": "Enterobacter sp.", "kingdom": "bakteri"}, {"id": 413, "name": "Escherichia Coli", "kingdom": "bakteri"}, {"id": 572, "name": "Escherichia intermedium", "kingdom": "bakteri"}, {"id": 571, "name": "Escherichia sp.", "kingdom": "bakteri"}, {"id": 680, "name": "Flavobacterium sp.", "kingdom": "bakteri"}, {"id": 685, "name": "Klebsiella aerogenes", "kingdom": "bakteri"}, {"id": 633, "name": "Klebsiella sp.", "kingdom": "bakteri"}, {"id": 639, "name": "Lactobacillus plantarum", "kingdom": "bakteri"}, {"id": 665, "name": "Mannheimia haemolytica", "kingdom": "bakteri"}, {"id": 643, "name": "Micrococcus sp.", "kingdom": "bakteri"}, {"id": 664, "name": "Moraxella sp.", "kingdom": "bakteri"}, {"id": 666, "name": "Neisseria sp.", "kingdom": "bakteri"}, {"id": 594, "name": "Pasteurella multocida", "kingdom": "bakteri"}, {"id": 642, "name": "Pasteurella sp.", "kingdom": "bakteri"}, {"id": 676, "name": "Proteus sp.", "kingdom": "bakteri"}, {"id": 631, "name": " Pseudomonas sp.", "kingdom": "bakteri"}, {"id": 686, "name": "Salmonella Enteritidis", "kingdom": "bakteri"}, {"id": 415, "name": "Salmonella sp.", "kingdom": "bakteri"}, {"id": 414, "name": "Staphylococcus aureus", "kingdom": "bakteri"}, {"id": 644, "name": "Staphylococcus epidermidis", "kingdom": "bakteri"}, {"id": 641, "name": "Staphylococcus intermedius", "kingdom": "bakteri"}, {"id": 635, "name": "Staphylococcus sp.", "kingdom": "bakteri"}, {"id": 684, "name": "Streptobacillus sp", "kingdom": "bakteri"}, {"id": 672, "name": "Streptococcus agalactiae", "kingdom": "bakteri"}, {"id": 637, "name": "Streptococcus sp.", "kingdom": "bakteri"}, {"id": 420, "name": "Tidak Diketahui", "kingdom": "bakteri"}, {"id": 586, "name": "Aardwolf", "kingdom": "hewan"}, {"id": 570, "name": "African Grey", "kingdom": "hewan"}, {"id": 421, "name": "Alpaca", "kingdom": "hewan"}, {"id": 5, "name": "angsa", "kingdom": "hewan"}, {"id": 578, "name": "Angsa Murai / Boha Wasur (Magpie Goose)", "kingdom": "hewan"}, {"id": 300, "name": "anjing", "kingdom": "hewan"}, {"id": 422, "name": "Anjing Affenpinsche", "kingdom": "hewan"}, {"id": 423, "name": "Anjing Alaskan", "kingdom": "hewan"}, {"id": 424, "name": "Anjing Basenji", "kingdom": "hewan"}, {"id": 304, "name": "Anjing Beagle", "kingdom": "hewan"}, {"id": 439, "name": "Anjing Belgian Malinois", "kingdom": "hewan"}, {"id": 595, "name": "Anjing Bernese Mountain Dog", "kingdom": "hewan"}, {"id": 609, "name": "Anjing Bichon", "kingdom": "hewan"}, {"id": 303, "name": "Anjing Bulldog", "kingdom": "hewan"}, {"id": 307, "name": "Anjing Chihuahua", "kingdom": "hewan"}, {"id": 658, "name": "Anjing Collie", "kingdom": "hewan"}, {"id": 427, "name": "Anjing Corgi", "kingdom": "hewan"}, {"id": 428, "name": "Anjing Cross", "kingdom": "hewan"}, {"id": 429, "name": "Anjing crossbreed weimaranev and labrador", "kingdom": "hewan"}, {"id": 320, "name": "Anjing Dachshund", "kingdom": "hewan"}, {"id": 302, "name": "Anjing Doberman Pinscher", "kingdom": "hewan"}, {"id": 430, "name": "Anjing Dogo Argentino", "kingdom": "hewan"}, {"id": 431, "name": "Anjing Domestik", "kingdom": "hewan"}, {"id": 432, "name": "Anjing English Bulldog", "kingdom": "hewan"}, {"id": 433, "name": "Anjing English Golden Retriever", "kingdom": "hewan"}, {"id": 590, "name": "Anjing French Bulldog", "kingdom": "hewan"}, {"id": 317, "name": "Anjing German Shepherd", "kingdom": "hewan"}, {"id": 434, "name": "Anjing Goldendoodle", "kingdom": "hewan"}, {"id": 313, "name": "Anjing Golden Retriever", "kingdom": "hewan"}, {"id": 435, "name": "Anjing Husky Mix", "kingdom": "hewan"}, {"id": 437, "name": "Anjing Japanese Akita", "kingdom": "hewan"}, {"id": 438, "name": "Anjing Jepang", "kingdom": "hewan"}, {"id": 581, "name": "Anjing Kintamani", "kingdom": "hewan"}, {"id": 316, "name": "Anjing Labrador Retriever", "kingdom": "hewan"}, {"id": 323, "name": "anjing lokal", "kingdom": "hewan"}, {"id": 440, "name": "Anjing Maltese", "kingdom": "hewan"}, {"id": 657, "name": "Anjing Maltipoo", "kingdom": "hewan"}, {"id": 319, "name": "Anjing Miniature Pinscher", "kingdom": "hewan"}, {"id": 442, "name": "Anjing Miniatur Schnauzer", "kingdom": "hewan"}, {"id": 441, "name": "Anjing Mini Pomeranian", "kingdom": "hewan"}, {"id": 443, "name": "Anjing Mix", "kingdom": "hewan"}, {"id": 444, "name": "Anjing Mix Peking", "kingdom": "hewan"}, {"id": 309, "name": "Anjing Pit Bull", "kingdom": "hewan"}, {"id": 451, "name": "Anjing Pitbull Terrier", "kingdom": "hewan"}, {"id": 305, "name": "Anjing Pomeranian", "kingdom": "hewan"}, {"id": 445, "name": "Anjing Poodle", "kingdom": "hewan"}, {"id": 321, "name": "Anjing Pug", "kingdom": "hewan"}, {"id": 446, "name": "Anjing Pug (Bostantemier)", "kingdom": "hewan"}, {"id": 301, "name": "anjing ras", "kingdom": "hewan"}, {"id": 447, "name": "Anjing Retriever", "kingdom": "hewan"}, {"id": 436, "name": "Anjing Rhodesian Ridgeback", "kingdom": "hewan"}, {"id": 310, "name": "Anjing Rotweiller", "kingdom": "hewan"}, {"id": 448, "name": "Anjing Shar Pei ", "kingdom": "hewan"}, {"id": 449, "name": "Anjing Shih Tzu", "kingdom": "hewan"}, {"id": 318, "name": "Anjing Shih Tzu", "kingdom": "hewan"}, {"id": 322, "name": "Anjing Siberian Husky", "kingdom": "hewan"}, {"id": 450, "name": "Anjing Swarovski Pomeranian", "kingdom": "hewan"}, {"id": 612, "name": "Ankole-Watusi", "kingdom": "hewan"}, {"id": 391, "name": "anoa", "kingdom": "hewan"}, {"id": 345, "name": "Aquatic", "kingdom": "hewan"}, {"id": 393, "name": "Arthropod", "kingdom": "hewan"}, {"id": 3, "name": "Ayam", "kingdom": "hewan"}, {"id": 22, "name": "ayam afkir", "kingdom": "hewan"}, {"id": 42, "name": "Ayam Ameraucana", "kingdom": "hewan"}, {"id": 26, "name": "Ayam Arab", "kingdom": "hewan"}, {"id": 23, "name": "Ayam Balenggek", "kingdom": "hewan"}, {"id": 11, "name": "Ayam Bangkok", "kingdom": "hewan"}, {"id": 27, "name": "Ayam Batik", "kingdom": "hewan"}, {"id": 10, "name": "Ayam bekisar", "kingdom": "hewan"}, {"id": 45, "name": "Ayam Birma", "kingdom": "hewan"}, {"id": 452, "name": "Ayam Bogor", "kingdom": "hewan"}, {"id": 36, "name": "Ayam Brahma", "kingdom": "hewan"}, {"id": 52, "name": "Ayam Broiler", "kingdom": "hewan"}, {"id": 453, "name": "Ayam Bull", "kingdom": "hewan"}, {"id": 454, "name": "Ayam Buras", "kingdom": "hewan"}, {"id": 20, "name": "Ayam Cemani", "kingdom": "hewan"}, {"id": 56, "name": "Ayam Cobb", "kingdom": "hewan"}, {"id": 31, "name": "Ayam Cochin", "kingdom": "hewan"}, {"id": 66, "name": "Ayam Cornish", "kingdom": "hewan"}, {"id": 691, "name": "Ayam FS Broiler", "kingdom": "hewan"}, {"id": 30, "name": "ayam gaga", "kingdom": "hewan"}, {"id": 669, "name": "Ayam GPS Broiler", "kingdom": "hewan"}, {"id": 62, "name": "Ayam Hubbard", "kingdom": "hewan"}, {"id": 12, "name": "ayam hutan", "kingdom": "hewan"}, {"id": 60, "name": "Ayam Hybro", "kingdom": "hewan"}, {"id": 63, "name": "Ayam Hyline", "kingdom": "hewan"}, {"id": 455, "name": "Ayam Isa Brown", "kingdom": "hewan"}, {"id": 456, "name": "Ayam Joper", "kingdom": "hewan"}, {"id": 41, "name": "ayam kampung", "kingdom": "hewan"}, {"id": 29, "name": "Ayam Kapas", "kingdom": "hewan"}, {"id": 68, "name": "ayam Kate", "kingdom": "hewan"}, {"id": 46, "name": "Ayam Kedu", "kingdom": "hewan"}, {"id": 9, "name": "Ayam Ketawa", "kingdom": "hewan"}, {"id": 457, "name": "Ayam Ketawa", "kingdom": "hewan"}, {"id": 19, "name": "ayam kokok balenggek", "kingdom": "hewan"}, {"id": 458, "name": "Ayam KUB", "kingdom": "hewan"}, {"id": 640, "name": "Ayam KUB-2", "kingdom": "hewan"}, {"id": 54, "name": "ayam layer", "kingdom": "hewan"}, {"id": 37, "name": "Ayam Leghorn", "kingdom": "hewan"}, {"id": 61, "name": "Ayam Lohman", "kingdom": "hewan"}, {"id": 459, "name": "Ayam Lohman Meat", "kingdom": "hewan"}, {"id": 460, "name": "Ayam Lohmann Indian River", "kingdom": "hewan"}, {"id": 461, "name": "Ayam Lokal", "kingdom": "hewan"}, {"id": 33, "name": "Ayam Mahkota/Jambul", "kingdom": "hewan"}, {"id": 21, "name": "Ayam Merawang", "kingdom": "hewan"}, {"id": 65, "name": "Ayam Missouri", "kingdom": "hewan"}, {"id": 43, "name": "Ayam Modern Game Bantam", "kingdom": "hewan"}, {"id": 16, "name": "Ayam Mutiara", "kingdom": "hewan"}, {"id": 44, "name": "Ayam Naked Neck", "kingdom": "hewan"}, {"id": 462, "name": "Ayam New Lohman", "kingdom": "hewan"}, {"id": 463, "name": "Ayam New Lohman Meat", "kingdom": "hewan"}, {"id": 24, "name": "Ayam Nunukan", "kingdom": "hewan"}, {"id": 28, "name": "Ayam Onagodari", "kingdom": "hewan"}, {"id": 40, "name": "Ayam Orpington", "kingdom": "hewan"}, {"id": 4, "name": "Ayam Pelung", "kingdom": "hewan"}, {"id": 51, "name": "Ayam Peru", "kingdom": "hewan"}, {"id": 464, "name": "Ayam Petelur", "kingdom": "hewan"}, {"id": 35, "name": "Ayam Pheasant", "kingdom": "hewan"}, {"id": 13, "name": "Ayam Philipine", "kingdom": "hewan"}, {"id": 34, "name": "Ayam Phoenix", "kingdom": "hewan"}, {"id": 32, "name": "Ayam Plymouth Rock", "kingdom": "hewan"}, {"id": 15, "name": "Ayam Poland", "kingdom": "hewan"}, {"id": 465, "name": "Ayam PS Broiler", "kingdom": "hewan"}, {"id": 466, "name": "Ayam PS Layer", "kingdom": "hewan"}, {"id": 38, "name": "Ayam Randah Batu", "kingdom": "hewan"}, {"id": 55, "name": "Ayam Ras", "kingdom": "hewan"}, {"id": 17, "name": "Ayam Ring Neck", "kingdom": "hewan"}, {"id": 39, "name": "Ayam Rosecomb", "kingdom": "hewan"}, {"id": 59, "name": "Ayam Ross", "kingdom": "hewan"}, {"id": 50, "name": "Ayam sedayu", "kingdom": "hewan"}, {"id": 602, "name": "Ayam Sembawa", "kingdom": "hewan"}, {"id": 467, "name": "Ayam Sempidan Biru", "kingdom": "hewan"}, {"id": 468, "name": "Ayam SENSI", "kingdom": "hewan"}, {"id": 49, "name": "Ayam Sentul", "kingdom": "hewan"}, {"id": 14, "name": "Ayam Serama", "kingdom": "hewan"}, {"id": 18, "name": "Ayam Siam", "kingdom": "hewan"}, {"id": 25, "name": "Ayam Sumatera", "kingdom": "hewan"}, {"id": 57, "name": "Ayam Sussex", "kingdom": "hewan"}, {"id": 47, "name": "Ayam Tukong", "kingdom": "hewan"}, {"id": 48, "name": "Ayam Walik", "kingdom": "hewan"}, {"id": 64, "name": "Ayam White Leghorn", "kingdom": "hewan"}, {"id": 292, "name": "babi", "kingdom": "hewan"}, {"id": 469, "name": "Babi Batam", "kingdom": "hewan"}, {"id": 470, "name": "Babi Landrace", "kingdom": "hewan"}, {"id": 293, "name": "Babi Liar / Hutan", "kingdom": "hewan"}, {"id": 471, "name": "Babi Lohman", "kingdom": "hewan"}, {"id": 472, "name": "Babi Lokal", "kingdom": "hewan"}, {"id": 587, "name": "Babirusa", "kingdom": "hewan"}, {"id": 473, "name": "Babi Yorkshire", "kingdom": "hewan"}, {"id": 372, "name": "badak", "kingdom": "hewan"}, {"id": 201, "name": "banteng", "kingdom": "hewan"}, {"id": 403, "name": "Bearded Dragon", "kingdom": "hewan"}, {"id": 79, "name": "Bebek", "kingdom": "hewan"}, {"id": 80, "name": "Bebek Peking", "kingdom": "hewan"}, {"id": 474, "name": "Bekantan", "kingdom": "hewan"}, {"id": 78, "name": "belibis", "kingdom": "hewan"}, {"id": 475, "name": "Beluntas", "kingdom": "hewan"}, {"id": 336, "name": "Berang-berang", "kingdom": "hewan"}, {"id": 365, "name": "Beruang", "kingdom": "hewan"}, {"id": 476, "name": "Beruang Madu", "kingdom": "hewan"}, {"id": 477, "name": "Beruk", "kingdom": "hewan"}, {"id": 378, "name": "Biawak", "kingdom": "hewan"}, {"id": 377, "name": "Binturong", "kingdom": "hewan"}, {"id": 601, "name": "Blackbuck", "kingdom": "hewan"}, {"id": 311, "name": "Boxer", "kingdom": "hewan"}, {"id": 368, "name": "Buaya", "kingdom": "hewan"}, {"id": 375, "name": "Bunglon", "kingdom": "hewan"}, {"id": 1, "name": "Burung", "kingdom": "hewan"}, {"id": 106, "name": "Burung Anis", "kingdom": "hewan"}, {"id": 88, "name": "Burung Anis Kembang", "kingdom": "hewan"}, {"id": 87, "name": "Burung Anis Merah", "kingdom": "hewan"}, {"id": 478, "name": "Burung Bangau", "kingdom": "hewan"}, {"id": 131, "name": "Burung Beo", "kingdom": "hewan"}, {"id": 137, "name": "Burung Black throte", "kingdom": "hewan"}, {"id": 150, "name": "Burung Branjangan", "kingdom": "hewan"}, {"id": 148, "name": "Burung Cendet/Pentet", "kingdom": "hewan"}, {"id": 610, "name": "Burung Cendrawasih", "kingdom": "hewan"}, {"id": 102, "name": "Burung Ciblek", "kingdom": "hewan"}, {"id": 109, "name": "Burung cililin", "kingdom": "hewan"}, {"id": 152, "name": "Burung Cipoh", "kingdom": "hewan"}, {"id": 124, "name": "Burung Cucak biru/selendang biru", "kingdom": "hewan"}, {"id": 155, "name": "Burung Cucak Cungkok", "kingdom": "hewan"}, {"id": 159, "name": "Burung Cucak Hijau", "kingdom": "hewan"}, {"id": 158, "name": "Burung Cucak Jenggot", "kingdom": "hewan"}, {"id": 116, "name": "Burung cucak ranting", "kingdom": "hewan"}, {"id": 125, "name": "Burung Cucak Rowo", "kingdom": "hewan"}, {"id": 480, "name": "Burung Dara", "kingdom": "hewan"}, {"id": 668, "name": "Burung Decu", "kingdom": "hewan"}, {"id": 90, "name": "Burung Derkuku", "kingdom": "hewan"}, {"id": 119, "name": "Burung Falk", "kingdom": "hewan"}, {"id": 123, "name": "Burung Finch", "kingdom": "hewan"}, {"id": 117, "name": "Burung Gagak", "kingdom": "hewan"}, {"id": 151, "name": "Burung Gelatik", "kingdom": "hewan"}, {"id": 101, "name": "Burung Glatik", "kingdom": "hewan"}, {"id": 670, "name": "Burung Grey Crowned Crane", "kingdom": "hewan"}, {"id": 108, "name": "Burung Hantu", "kingdom": "hewan"}, {"id": 135, "name": "Burung Jagal Papua", "kingdom": "hewan"}, {"id": 136, "name": "Burung Kacer", "kingdom": "hewan"}, {"id": 103, "name": "Burung Kakatua", "kingdom": "hewan"}, {"id": 598, "name": "Burung Kangkareng Perut Putih", "kingdom": "hewan"}, {"id": 115, "name": "Burung kapas tembak", "kingdom": "hewan"}, {"id": 481, "name": "Burung Karuang", "kingdom": "hewan"}, {"id": 99, "name": "Burung Kasuari", "kingdom": "hewan"}, {"id": 146, "name": "Burung Kenari", "kingdom": "hewan"}, {"id": 156, "name": "Burung Kepodang", "kingdom": "hewan"}, {"id": 110, "name": "Burung Kolibri", "kingdom": "hewan"}, {"id": 111, "name": "Burung Konin", "kingdom": "hewan"}, {"id": 138, "name": "Burung Kutilang", "kingdom": "hewan"}, {"id": 81, "name": "burung lain", "kingdom": "hewan"}, {"id": 85, "name": "Burung Love Bird", "kingdom": "hewan"}, {"id": 121, "name": "Burung Macau", "kingdom": "hewan"}, {"id": 132, "name": "Burung Makau", "kingdom": "hewan"}, {"id": 126, "name": "Burung Manyar", "kingdom": "hewan"}, {"id": 118, "name": "Burung Merak", "kingdom": "hewan"}, {"id": 157, "name": "Burung Merbah", "kingdom": "hewan"}, {"id": 82, "name": "Burung Merpati", "kingdom": "hewan"}, {"id": 113, "name": "Burung Murai", "kingdom": "hewan"}, {"id": 114, "name": "Burung Murai Batu", "kingdom": "hewan"}, {"id": 120, "name": "Burung Nuri", "kingdom": "hewan"}, {"id": 606, "name": "Burung Nuri Kepala Hitam", "kingdom": "hewan"}, {"id": 153, "name": "Burung Panca Warna", "kingdom": "hewan"}, {"id": 112, "name": "Burung Parkit", "kingdom": "hewan"}, {"id": 597, "name": "Burung Paruh Bengkok", "kingdom": "hewan"}, {"id": 145, "name": "Burung Pelatuk", "kingdom": "hewan"}, {"id": 144, "name": "Burung Pelatuk Bawang", "kingdom": "hewan"}, {"id": 577, "name": "Burung Pelikan", "kingdom": "hewan"}, {"id": 579, "name": "Burung Pelikan Kacamata", "kingdom": "hewan"}, {"id": 98, "name": "Burung Pentet", "kingdom": "hewan"}, {"id": 140, "name": "Burung Perbak Kuning", "kingdom": "hewan"}, {"id": 89, "name": "Burung Perkutut", "kingdom": "hewan"}, {"id": 127, "name": "Burung Pipit", "kingdom": "hewan"}, {"id": 154, "name": "Burung Pleci", "kingdom": "hewan"}, {"id": 86, "name": "Burung Pleci", "kingdom": "hewan"}, {"id": 142, "name": "Burung Poksay", "kingdom": "hewan"}, {"id": 141, "name": "Burung Punglor Kembang", "kingdom": "hewan"}, {"id": 100, "name": "Burung Puyuh", "kingdom": "hewan"}, {"id": 139, "name": "Burung Rambatan", "kingdom": "hewan"}, {"id": 482, "name": "Burung Rangkong", "kingdom": "hewan"}, {"id": 620, "name": "burung rio-rio", "kingdom": "hewan"}, {"id": 107, "name": "Burung Samyong", "kingdom": "hewan"}, {"id": 129, "name": "Burung Sirpu", "kingdom": "hewan"}, {"id": 84, "name": "Burung Srindit", "kingdom": "hewan"}, {"id": 147, "name": "Burung Tekukur", "kingdom": "hewan"}, {"id": 130, "name": "Burung Tengkek Buto", "kingdom": "hewan"}, {"id": 483, "name": "Burung Tiung", "kingdom": "hewan"}, {"id": 149, "name": "Burung Tledekan Gunung", "kingdom": "hewan"}, {"id": 128, "name": "Burung Trucukan/Trocok", "kingdom": "hewan"}, {"id": 660, "name": "Burung Tuwur", "kingdom": "hewan"}, {"id": 615, "name": "Burung Unta", "kingdom": "hewan"}, {"id": 484, "name": "Burung Walet", "kingdom": "hewan"}, {"id": 143, "name": "Burung Wambi", "kingdom": "hewan"}, {"id": 400, "name": "Cacing", "kingdom": "hewan"}, {"id": 401, "name": "Cacing Lumbricus", "kingdom": "hewan"}, {"id": 296, "name": "camelid", "kingdom": "hewan"}, {"id": 299, "name": "canine", "kingdom": "hewan"}, {"id": 568, "name": "Capped Lory", "kingdom": "hewan"}, {"id": 674, "name": "Caracal", "kingdom": "hewan"}, {"id": 298, "name": "Carnivore", "kingdom": "hewan"}, {"id": 656, "name": "Chacoan mara", "kingdom": "hewan"}, {"id": 308, "name": "Chow Chow", "kingdom": "hewan"}, {"id": 348, "name": "crustacea", "kingdom": "hewan"}, {"id": 485, "name": "Cumi-cumi", "kingdom": "hewan"}, {"id": 67, "name": "DOC", "kingdom": "hewan"}, {"id": 681, "name": "DOC Broiler", "kingdom": "hewan"}, {"id": 673, "name": "DOC layer", "kingdom": "hewan"}, {"id": 73, "name": "DOD", "kingdom": "hewan"}, {"id": 213, "name": "domba", "kingdom": "hewan"}, {"id": 645, "name": "Domba Awassi", "kingdom": "hewan"}, {"id": 217, "name": "domba batur", "kingdom": "hewan"}, {"id": 607, "name": "Domba Dorper", "kingdom": "hewan"}, {"id": 218, "name": "Domba Ekor Gemuk", "kingdom": "hewan"}, {"id": 486, "name": "Domba Ekor Tipis", "kingdom": "hewan"}, {"id": 215, "name": "domba garut", "kingdom": "hewan"}, {"id": 214, "name": "domba kisar", "kingdom": "hewan"}, {"id": 608, "name": "Domba merino", "kingdom": "hewan"}, {"id": 653, "name": "domba texel", "kingdom": "hewan"}, {"id": 216, "name": "domba wonosobo", "kingdom": "hewan"}, {"id": 638, "name": "DOQ", "kingdom": "hewan"}, {"id": 407, "name": "Dry Snake", "kingdom": "hewan"}, {"id": 569, "name": "Dusky Lory", "kingdom": "hewan"}, {"id": 355, "name": "Duyung/Dugong", "kingdom": "hewan"}, {"id": 619, "name": "Ektoparasit", "kingdom": "hewan"}, {"id": 588, "name": "Eland", "kingdom": "hewan"}, {"id": 122, "name": "Elang", "kingdom": "hewan"}, {"id": 76, "name": "entog", "kingdom": "hewan"}, {"id": 487, "name": "Entok", "kingdom": "hewan"}, {"id": 488, "name": "Entok Lokal", "kingdom": "hewan"}, {"id": 134, "name": "Eos Borneo", "kingdom": "hewan"}, {"id": 223, "name": "equine", "kingdom": "hewan"}, {"id": 324, "name": "feline", "kingdom": "hewan"}, {"id": 385, "name": "Gajah", "kingdom": "hewan"}, {"id": 312, "name": "Great Dane", "kingdom": "hewan"}, {"id": 689, "name": "Gurita", "kingdom": "hewan"}, {"id": 363, "name": "hamster", "kingdom": "hewan"}, {"id": 489, "name": "Hamster Lokal", "kingdom": "hewan"}, {"id": 384, "name": "harimau", "kingdom": "hewan"}, {"id": 490, "name": "Harimau", "kingdom": "hewan"}, {"id": 580, "name": "Hiena Belang (Striped hyena)", "kingdom": "hewan"}, {"id": 584, "name": "Hiena Coklat", "kingdom": "hewan"}, {"id": 585, "name": "Hiena Tutul", "kingdom": "hewan"}, {"id": 370, "name": "iguana", "kingdom": "hewan"}, {"id": 346, "name": "ikan", "kingdom": "hewan"}, {"id": 491, "name": "Ikan Gabus", "kingdom": "hewan"}, {"id": 492, "name": "Ikan Garing", "kingdom": "hewan"}, {"id": 493, "name": "Ikan Gurami", "kingdom": "hewan"}, {"id": 494, "name": "Ikan Lele", "kingdom": "hewan"}, {"id": 495, "name": "Ikan Mas", "kingdom": "hewan"}, {"id": 496, "name": "Ikan Mas Koi", "kingdom": "hewan"}, {"id": 497, "name": "Ikan Mungkui", "kingdom": "hewan"}, {"id": 498, "name": "Ikan Nila", "kingdom": "hewan"}, {"id": 499, "name": "Ikan Papuyu", "kingdom": "hewan"}, {"id": 675, "name": "Ikan Pari", "kingdom": "hewan"}, {"id": 500, "name": "Ikan Patin", "kingdom": "hewan"}, {"id": 501, "name": "Ikan Selais", "kingdom": "hewan"}, {"id": 613, "name": "Ikan Sentani Gudgeon", "kingdom": "hewan"}, {"id": 502, "name": "Ikan Sepat Siam", "kingdom": "hewan"}, {"id": 347, "name": "ikan tongkol", "kingdom": "hewan"}, {"id": 503, "name": "Ikan Tuna", "kingdom": "hewan"}, {"id": 69, "name": "itik", "kingdom": "hewan"}, {"id": 70, "name": "itik alabio", "kingdom": "hewan"}, {"id": 504, "name": "Itik Bayang", "kingdom": "hewan"}, {"id": 505, "name": "Itik Lokal", "kingdom": "hewan"}, {"id": 506, "name": "Itik MA", "kingdom": "hewan"}, {"id": 507, "name": "Itik Manila", "kingdom": "hewan"}, {"id": 508, "name": "Itik Mojosari", "kingdom": "hewan"}, {"id": 74, "name": "Itik Peking", "kingdom": "hewan"}, {"id": 75, "name": "Itik Peking Mojosari Putih", "kingdom": "hewan"}, {"id": 509, "name": "Itik Petelur", "kingdom": "hewan"}, {"id": 72, "name": "itik pitalah", "kingdom": "hewan"}, {"id": 71, "name": "itik tegal", "kingdom": "hewan"}, {"id": 91, "name": "Jalak", "kingdom": "hewan"}, {"id": 92, "name": "Jalak Bali", "kingdom": "hewan"}, {"id": 97, "name": "Jalak Donking", "kingdom": "hewan"}, {"id": 94, "name": "Jalak Kerbau", "kingdom": "hewan"}, {"id": 95, "name": "Jalak Perling", "kingdom": "hewan"}, {"id": 93, "name": "Jalak Putih", "kingdom": "hewan"}, {"id": 96, "name": "Jalak Suren", "kingdom": "hewan"}, {"id": 398, "name": "Jangkrik", "kingdom": "hewan"}, {"id": 582, "name": "Jerapah", "kingdom": "hewan"}, {"id": 408, "name": "Kadal", "kingdom": "hewan"}, {"id": 105, "name": "Kakatua jambul kuning", "kingdom": "hewan"}, {"id": 104, "name": "Kakatua jambul putih", "kingdom": "hewan"}, {"id": 77, "name": "kalkun", "kingdom": "hewan"}, {"id": 411, "name": "Kalong", "kingdom": "hewan"}, {"id": 203, "name": "kambing", "kingdom": "hewan"}, {"id": 208, "name": "kambing alpine", "kingdom": "hewan"}, {"id": 630, "name": "Kambing anglo nubian", "kingdom": "hewan"}, {"id": 510, "name": "Kambing Benggala", "kingdom": "hewan"}, {"id": 206, "name": "kambing boer", "kingdom": "hewan"}, {"id": 677, "name": "Kambing Boerka", "kingdom": "hewan"}, {"id": 205, "name": "kambing etawa", "kingdom": "hewan"}, {"id": 511, "name": "Kambing Jawa Randu", "kingdom": "hewan"}, {"id": 209, "name": "kambing Kacang", "kingdom": "hewan"}, {"id": 211, "name": "Kambing Kaligesing", "kingdom": "hewan"}, {"id": 512, "name": "Kambing Lokal", "kingdom": "hewan"}, {"id": 648, "name": "Kambing Marica", "kingdom": "hewan"}, {"id": 204, "name": "kambing pe", "kingdom": "hewan"}, {"id": 622, "name": "Kambing perah", "kingdom": "hewan"}, {"id": 624, "name": "Kambing potong", "kingdom": "hewan"}, {"id": 207, "name": "kambing saanen", "kingdom": "hewan"}, {"id": 210, "name": "Kambing Saburai", "kingdom": "hewan"}, {"id": 623, "name": "Kambing sapera", "kingdom": "hewan"}, {"id": 212, "name": "Kambing Senduro", "kingdom": "hewan"}, {"id": 513, "name": "Kancil", "kingdom": "hewan"}, {"id": 604, "name": "Kangguru", "kingdom": "hewan"}, {"id": 688, "name": "Kapibara", "kingdom": "hewan"}, {"id": 381, "name": "Katak", "kingdom": "hewan"}, {"id": 650, "name": "Keledai", "kingdom": "hewan"}, {"id": 380, "name": "Kelelawar", "kingdom": "hewan"}, {"id": 295, "name": "kelinci", "kingdom": "hewan"}, {"id": 514, "name": "Keong Rawa", "kingdom": "hewan"}, {"id": 515, "name": "Kepiting", "kingdom": "hewan"}, {"id": 338, "name": "kera", "kingdom": "hewan"}, {"id": 516, "name": "Kerang", "kingdom": "hewan"}, {"id": 193, "name": "kerbau", "kingdom": "hewan"}, {"id": 200, "name": "kerbau belang", "kingdom": "hewan"}, {"id": 198, "name": "Kerbau Kuntu", "kingdom": "hewan"}, {"id": 517, "name": "Kerbau Lokal", "kingdom": "hewan"}, {"id": 196, "name": "kerbau Lumpur", "kingdom": "hewan"}, {"id": 194, "name": "kerbau moah", "kingdom": "hewan"}, {"id": 199, "name": "Kerbau Murah", "kingdom": "hewan"}, {"id": 518, "name": "Kerbau rawa", "kingdom": "hewan"}, {"id": 195, "name": "kerbau sumbawa", "kingdom": "hewan"}, {"id": 197, "name": "kerbau Sungai", "kingdom": "hewan"}, {"id": 625, "name": "Kijang", "kingdom": "hewan"}, {"id": 369, "name": "Komodo", "kingdom": "hewan"}, {"id": 325, "name": "kucing", "kingdom": "hewan"}, {"id": 671, "name": "Kucing Abyssinian", "kingdom": "hewan"}, {"id": 519, "name": "Kucing ACL", "kingdom": "hewan"}, {"id": 329, "name": "Kucing Angora", "kingdom": "hewan"}, {"id": 330, "name": "Kucing Bengal", "kingdom": "hewan"}, {"id": 520, "name": "Kucing Bengal Mix", "kingdom": "hewan"}, {"id": 521, "name": "Kucing Bisma", "kingdom": "hewan"}, {"id": 522, "name": "Kucing British", "kingdom": "hewan"}, {"id": 523, "name": "Kucing British short hair", "kingdom": "hewan"}, {"id": 524, "name": "Kucing Domestik", "kingdom": "hewan"}, {"id": 525, "name": "Kucing Domestik Short Hair", "kingdom": "hewan"}, {"id": 659, "name": "Kucing european shorthair", "kingdom": "hewan"}, {"id": 526, "name": "Kucing Exotic", "kingdom": "hewan"}, {"id": 527, "name": "Kucing Himalaya", "kingdom": "hewan"}, {"id": 334, "name": "Kucing hutan", "kingdom": "hewan"}, {"id": 333, "name": "kucing kampung", "kingdom": "hewan"}, {"id": 528, "name": "Kucing Kinkalow", "kingdom": "hewan"}, {"id": 332, "name": "kucing lokal", "kingdom": "hewan"}, {"id": 529, "name": "Kucing Mainecoon", "kingdom": "hewan"}, {"id": 530, "name": "Kucing Mainecoon Mix", "kingdom": "hewan"}, {"id": 531, "name": "Kucing Mc Persia", "kingdom": "hewan"}, {"id": 532, "name": "Kucing Menkun", "kingdom": "hewan"}, {"id": 533, "name": "Kucing Mix", "kingdom": "hewan"}, {"id": 534, "name": "Kucing Mix Persia", "kingdom": "hewan"}, {"id": 535, "name": "Kucing Munchkin", "kingdom": "hewan"}, {"id": 536, "name": "Kucing Munchkin Mix", "kingdom": "hewan"}, {"id": 537, "name": "Kucing NVO", "kingdom": "hewan"}, {"id": 538, "name": "Kucing Peranakan", "kingdom": "hewan"}, {"id": 327, "name": "Kucing Persia", "kingdom": "hewan"}, {"id": 539, "name": "Kucing Persia Himalaya", "kingdom": "hewan"}, {"id": 540, "name": "Kucing Pignose", "kingdom": "hewan"}, {"id": 683, "name": "Kucing Ragdoll", "kingdom": "hewan"}, {"id": 326, "name": "kucing ras", "kingdom": "hewan"}, {"id": 617, "name": "Kucing scottish fold", "kingdom": "hewan"}, {"id": 328, "name": "Kucing Siam", "kingdom": "hewan"}, {"id": 541, "name": "Kucing Siamese", "kingdom": "hewan"}, {"id": 331, "name": "Kucing Sphynx", "kingdom": "hewan"}, {"id": 224, "name": "kuda", "kingdom": "hewan"}, {"id": 249, "name": "Kuda Aceh", "kingdom": "hewan"}, {"id": 273, "name": "Kuda Akhal Teke", "kingdom": "hewan"}, {"id": 277, "name": "Kuda American Paint", "kingdom": "hewan"}, {"id": 290, "name": "Kuda American Quarter", "kingdom": "hewan"}, {"id": 265, "name": "Kuda Andalusia", "kingdom": "hewan"}, {"id": 284, "name": "Kuda Appaloosa", "kingdom": "hewan"}, {"id": 280, "name": "Kuda Arab", "kingdom": "hewan"}, {"id": 289, "name": "Kuda Australia", "kingdom": "hewan"}, {"id": 259, "name": "Kuda Bali", "kingdom": "hewan"}, {"id": 260, "name": "Kuda Batak", "kingdom": "hewan"}, {"id": 256, "name": "Kuda Belgia", "kingdom": "hewan"}, {"id": 269, "name": "Kuda Bima", "kingdom": "hewan"}, {"id": 239, "name": "Kuda Black Forest", "kingdom": "hewan"}, {"id": 245, "name": "Kuda Bone", "kingdom": "hewan"}, {"id": 262, "name": "Kuda Bugis", "kingdom": "hewan"}, {"id": 254, "name": "Kuda Clydesdale", "kingdom": "hewan"}, {"id": 283, "name": "Kuda Dutch Warmblood", "kingdom": "hewan"}, {"id": 238, "name": "Kuda Falabella", "kingdom": "hewan"}, {"id": 237, "name": "Kuda Fjord", "kingdom": "hewan"}, {"id": 240, "name": "Kuda Flores", "kingdom": "hewan"}, {"id": 227, "name": "Kuda Friesian", "kingdom": "hewan"}, {"id": 268, "name": "Kuda Gorontalo", "kingdom": "hewan"}, {"id": 253, "name": "Kuda Hackney", "kingdom": "hewan"}, {"id": 286, "name": "Kuda Hanoverian", "kingdom": "hewan"}, {"id": 278, "name": "Kuda Holsteiner", "kingdom": "hewan"}, {"id": 250, "name": "Kuda Inggris", "kingdom": "hewan"}, {"id": 274, "name": "Kuda Irlandia", "kingdom": "hewan"}, {"id": 232, "name": "Kuda Jalil", "kingdom": "hewan"}, {"id": 248, "name": "Kuda Jawa", "kingdom": "hewan"}, {"id": 263, "name": "Kuda Jeneponto", "kingdom": "hewan"}, {"id": 271, "name": "Kuda Kuningan", "kingdom": "hewan"}, {"id": 281, "name": "Kuda Lipizzan", "kingdom": "hewan"}, {"id": 225, "name": "Kuda Lokal", "kingdom": "hewan"}, {"id": 257, "name": "Kuda Lombok", "kingdom": "hewan"}, {"id": 279, "name": "Kuda Lusitano", "kingdom": "hewan"}, {"id": 246, "name": "Kuda Mahar", "kingdom": "hewan"}, {"id": 266, "name": "Kuda Mandar", "kingdom": "hewan"}, {"id": 244, "name": "Kuda Mangarai", "kingdom": "hewan"}, {"id": 272, "name": "Kuda Marwari", "kingdom": "hewan"}, {"id": 234, "name": "Kuda Meydan City", "kingdom": "hewan"}, {"id": 270, "name": "Kuda Minahasa", "kingdom": "hewan"}, {"id": 282, "name": "Kuda Missouri Fox Trotter", "kingdom": "hewan"}, {"id": 276, "name": "Kuda Morgan", "kingdom": "hewan"}, {"id": 229, "name": "Kuda Mustang", "kingdom": "hewan"}, {"id": 241, "name": "Kuda Ngada", "kingdom": "hewan"}, {"id": 589, "name": "Kuda Nil", "kingdom": "hewan"}, {"id": 255, "name": "Kuda Percheron", "kingdom": "hewan"}, {"id": 285, "name": "Kuda Peruvian Paso", "kingdom": "hewan"}, {"id": 231, "name": "Kuda Plavius", "kingdom": "hewan"}, {"id": 252, "name": "Kuda Poney", "kingdom": "hewan"}, {"id": 267, "name": "Kuda Priangan", "kingdom": "hewan"}, {"id": 287, "name": "Kuda Racking", "kingdom": "hewan"}, {"id": 236, "name": "Kuda Ras", "kingdom": "hewan"}, {"id": 230, "name": "Kuda Rocky Mountain", "kingdom": "hewan"}, {"id": 226, "name": "Kuda Sadel Amerika", "kingdom": "hewan"}, {"id": 243, "name": "Kuda Sawu", "kingdom": "hewan"}, {"id": 235, "name": "Kuda Seattle Dancer", "kingdom": "hewan"}, {"id": 228, "name": "Kuda Shire", "kingdom": "hewan"}, {"id": 233, "name": "Kuda Snaafi Dancer", "kingdom": "hewan"}, {"id": 251, "name": "Kuda Suffolk", "kingdom": "hewan"}, {"id": 264, "name": "Kuda Sulawesi", "kingdom": "hewan"}, {"id": 261, "name": "Kuda Sumatera Barat", "kingdom": "hewan"}, {"id": 247, "name": "Kuda Sumba", "kingdom": "hewan"}, {"id": 258, "name": "Kuda Sumbawa", "kingdom": "hewan"}, {"id": 288, "name": "Kuda Thoroughbred", "kingdom": "hewan"}, {"id": 242, "name": "Kuda Timor", "kingdom": "hewan"}, {"id": 275, "name": "Kuda Trakehner", "kingdom": "hewan"}, {"id": 344, "name": "Kukang", "kingdom": "hewan"}, {"id": 661, "name": "Kungkang", "kingdom": "hewan"}, {"id": 357, "name": "Kura-kura", "kingdom": "hewan"}, {"id": 663, "name": "Kuskus", "kingdom": "hewan"}, {"id": 542, "name": "Lalat", "kingdom": "hewan"}, {"id": 392, "name": "landak", "kingdom": "hewan"}, {"id": 599, "name": "Landak Laut (Bulu Babi)", "kingdom": "hewan"}, {"id": 294, "name": "lapinines", "kingdom": "hewan"}, {"id": 396, "name": "lebah", "kingdom": "hewan"}, {"id": 662, "name": "Lemur", "kingdom": "hewan"}, {"id": 406, "name": "Leopard Gecko", "kingdom": "hewan"}, {"id": 379, "name": "linsang", "kingdom": "hewan"}, {"id": 667, "name": "Llama", "kingdom": "hewan"}, {"id": 614, "name": "Lobster air tawar", "kingdom": "hewan"}, {"id": 353, "name": "lumba-lumba", "kingdom": "hewan"}, {"id": 335, "name": "Lutrinae", "kingdom": "hewan"}, {"id": 543, "name": "Lutung", "kingdom": "hewan"}, {"id": 628, "name": "Macaca maura", "kingdom": "hewan"}, {"id": 383, "name": "Macan Dahan", "kingdom": "hewan"}, {"id": 576, "name": "Macan Tutul", "kingdom": "hewan"}, {"id": 605, "name": "Makaka", "kingdom": "hewan"}, {"id": 352, "name": "Mamalia Laut", "kingdom": "hewan"}, {"id": 652, "name": "Mandrill", "kingdom": "hewan"}, {"id": 544, "name": "Manusia", "kingdom": "hewan"}, {"id": 593, "name": "Marmoset", "kingdom": "hewan"}, {"id": 362, "name": "marmut", "kingdom": "hewan"}, {"id": 359, "name": "mencit", "kingdom": "hewan"}, {"id": 83, "name": "Merpati Kipas", "kingdom": "hewan"}, {"id": 611, "name": "Mirkat", "kingdom": "hewan"}, {"id": 350, "name": "mollusca", "kingdom": "hewan"}, {"id": 222, "name": "Monogastric", "kingdom": "hewan"}, {"id": 343, "name": "monyet", "kingdom": "hewan"}, {"id": 342, "name": "monyet dunia lama", "kingdom": "hewan"}, {"id": 600, "name": "Monyet Yaki", "kingdom": "hewan"}, {"id": 376, "name": "musang", "kingdom": "hewan"}, {"id": 626, "name": "Napu", "kingdom": "hewan"}, {"id": 395, "name": "nyamuk", "kingdom": "hewan"}, {"id": 297, "name": "onta", "kingdom": "hewan"}, {"id": 340, "name": "orang utan", "kingdom": "hewan"}, {"id": 341, "name": "Owa", "kingdom": "hewan"}, {"id": 354, "name": "Paus", "kingdom": "hewan"}, {"id": 649, "name": "Penguin", "kingdom": "hewan"}, {"id": 545, "name": "Penyu", "kingdom": "hewan"}, {"id": 133, "name": "Perkici Pelangi", "kingdom": "hewan"}, {"id": 291, "name": "porcine", "kingdom": "hewan"}, {"id": 337, "name": "Primate", "kingdom": "hewan"}, {"id": 410, "name": "Pteropus", "kingdom": "hewan"}, {"id": 306, "name": "Pudel", "kingdom": "hewan"}, {"id": 592, "name": "Rakun", "kingdom": "hewan"}, {"id": 402, "name": "Reptile", "kingdom": "hewan"}, {"id": 358, "name": "Rodentia", "kingdom": "hewan"}, {"id": 419, "name": "Rubah", "kingdom": "hewan"}, {"id": 160, "name": "Ruminan", "kingdom": "hewan"}, {"id": 161, "name": "ruminan besar", "kingdom": "hewan"}, {"id": 202, "name": "ruminan kecil", "kingdom": "hewan"}, {"id": 219, "name": "rusa", "kingdom": "hewan"}, {"id": 220, "name": "rusa lokal", "kingdom": "hewan"}, {"id": 546, "name": "Rusa Sambar", "kingdom": "hewan"}, {"id": 547, "name": "Rusa Totol", "kingdom": "hewan"}, {"id": 221, "name": "Rusa Tutul", "kingdom": "hewan"}, {"id": 591, "name": "Salmon", "kingdom": "hewan"}, {"id": 315, "name": "Samoyed", "kingdom": "hewan"}, {"id": 162, "name": "sapi", "kingdom": "hewan"}, {"id": 163, "name": "sapi aceh", "kingdom": "hewan"}, {"id": 165, "name": "sapi angus", "kingdom": "hewan"}, {"id": 174, "name": "sapi bali", "kingdom": "hewan"}, {"id": 175, "name": "Sapi Bali Cross", "kingdom": "hewan"}, {"id": 181, "name": "Sapi Belgian Blue", "kingdom": "hewan"}, {"id": 655, "name": "sapi bibit", "kingdom": "hewan"}, {"id": 189, "name": "sapi brahman", "kingdom": "hewan"}, {"id": 172, "name": "Sapi Brahman Cross", "kingdom": "hewan"}, {"id": 166, "name": "sapi brangus", "kingdom": "hewan"}, {"id": 548, "name": "Sapi Bull", "kingdom": "hewan"}, {"id": 549, "name": "Sapi Cross", "kingdom": "hewan"}, {"id": 192, "name": "sapi fh", "kingdom": "hewan"}, {"id": 182, "name": "Sapi Galacian Blond", "kingdom": "hewan"}, {"id": 550, "name": "Sapi Galician Blond Cross", "kingdom": "hewan"}, {"id": 178, "name": "Sapi Jabres", "kingdom": "hewan"}, {"id": 183, "name": "SAPI JERSEY", "kingdom": "hewan"}, {"id": 176, "name": "Sapi Kaur", "kingdom": "hewan"}, {"id": 596, "name": "Sapi Krui", "kingdom": "hewan"}, {"id": 168, "name": "Sapi Kuantan", "kingdom": "hewan"}, {"id": 188, "name": "sapi limosin", "kingdom": "hewan"}, {"id": 629, "name": "Sapi limosin cross", "kingdom": "hewan"}, {"id": 551, "name": "Sapi Limousin PO", "kingdom": "hewan"}, {"id": 418, "name": "Sapi Lokal", "kingdom": "hewan"}, {"id": 184, "name": "sapi madura", "kingdom": "hewan"}, {"id": 177, "name": "Sapi Madura Cross", "kingdom": "hewan"}, {"id": 552, "name": "Sapi Mix", "kingdom": "hewan"}, {"id": 190, "name": "sapi ongole", "kingdom": "hewan"}, {"id": 170, "name": "Sapi Pasundan", "kingdom": "hewan"}, {"id": 191, "name": "sapi perah", "kingdom": "hewan"}, {"id": 185, "name": "sapi pesisir", "kingdom": "hewan"}, {"id": 164, "name": "sapi po", "kingdom": "hewan"}, {"id": 553, "name": "Sapi PO Cross", "kingdom": "hewan"}, {"id": 171, "name": "Sapi PO Donggala", "kingdom": "hewan"}, {"id": 603, "name": "Sapi Pogasi", "kingdom": "hewan"}, {"id": 180, "name": "Sapi PO Kebumen", "kingdom": "hewan"}, {"id": 554, "name": "Sapi Potong", "kingdom": "hewan"}, {"id": 167, "name": "Sapi Rancah", "kingdom": "hewan"}, {"id": 179, "name": "Sapi Rote", "kingdom": "hewan"}, {"id": 187, "name": "sapi simental", "kingdom": "hewan"}, {"id": 555, "name": "Sapi Simental Bali", "kingdom": "hewan"}, {"id": 556, "name": "Sapi Simental Cross", "kingdom": "hewan"}, {"id": 557, "name": "Sapi Simpo", "kingdom": "hewan"}, {"id": 173, "name": "Sapi Sumba Ongole", "kingdom": "hewan"}, {"id": 186, "name": "sapi sumbawa", "kingdom": "hewan"}, {"id": 169, "name": "Sapi Wagyu", "kingdom": "hewan"}, {"id": 364, "name": "Satwa liar", "kingdom": "hewan"}, {"id": 558, "name": "Sawit", "kingdom": "hewan"}, {"id": 559, "name": "Semut", "kingdom": "hewan"}, {"id": 394, "name": "serangga", "kingdom": "hewan"}, {"id": 618, "name": "Serval", "kingdom": "hewan"}, {"id": 373, "name": "Siamang", "kingdom": "hewan"}, {"id": 339, "name": "simian", "kingdom": "hewan"}, {"id": 573, "name": "Simpai", "kingdom": "hewan"}, {"id": 390, "name": "singa", "kingdom": "hewan"}, {"id": 356, "name": "Singa Laut", "kingdom": "hewan"}, {"id": 351, "name": "siput", "kingdom": "hewan"}, {"id": 687, "name": "Sitatunga", "kingdom": "hewan"}, {"id": 314, "name": "St Bernard", "kingdom": "hewan"}, {"id": 371, "name": "Sugar Glider", "kingdom": "hewan"}, {"id": 367, "name": "tapir", "kingdom": "hewan"}, {"id": 382, "name": "Tarantula", "kingdom": "hewan"}, {"id": 405, "name": "Tegu", "kingdom": "hewan"}, {"id": 682, "name": "Teripang", "kingdom": "hewan"}, {"id": 627, "name": "Terumbu karang", "kingdom": "hewan"}, {"id": 360, "name": "tikus", "kingdom": "hewan"}, {"id": 361, "name": "Tikus Putih", "kingdom": "hewan"}, {"id": 560, "name": "Tikus Rattus Norvegicus", "kingdom": "hewan"}, {"id": 374, "name": "Tokay Gecko", "kingdom": "hewan"}, {"id": 404, "name": "Tokek Leopard", "kingdom": "hewan"}, {"id": 366, "name": "tupai", "kingdom": "hewan"}, {"id": 561, "name": "Tupai Terbang", "kingdom": "hewan"}, {"id": 349, "name": "udang", "kingdom": "hewan"}, {"id": 386, "name": "ular", "kingdom": "hewan"}, {"id": 388, "name": "Ular Boa", "kingdom": "hewan"}, {"id": 387, "name": "Ular Boold Phyton", "kingdom": "hewan"}, {"id": 409, "name": "Ular Kering", "kingdom": "hewan"}, {"id": 389, "name": "Ular Retic", "kingdom": "hewan"}, {"id": 562, "name": "Ulat", "kingdom": "hewan"}, {"id": 399, "name": "Ulat Bambu", "kingdom": "hewan"}, {"id": 397, "name": "Ulat Hongkong", "kingdom": "hewan"}, {"id": 2, "name": "Unggas", "kingdom": "hewan"}, {"id": 563, "name": "Ungko", "kingdom": "hewan"}, {"id": 564, "name": "Uwa-uwa", "kingdom": "hewan"}, {"id": 636, "name": "Walabi", "kingdom": "hewan"}, {"id": 583, "name": "Waterbuck", "kingdom": "hewan"}, {"id": 616, "name": "Wildebeest", "kingdom": "hewan"}, {"id": 565, "name": "Zebra", "kingdom": "hewan"}, {"id": 566, "name": "Zebra Afrika", "kingdom": "hewan"}, {"id": 647, "name": "Foot-and-mouth disease virus", "kingdom": "virus"}, {"id": 651, "name": "Influenza A virus", "kingdom": "virus"}, {"id": 646, "name": "Lumpy skin disease virus", "kingdom": "virus"}, {"id": 574, "name": "Tidak Diketahui", "kingdom": "virus"}];

const EMPTY_SAMPLE = {
  sample_code_cust: "", sample_model: "", specimen_group: "", specimen_type: "",
  species: "", preservative: "", packaging: "", production_date: "",
  expired_date: "", sex: "", age: "", unit_age: "bulan", owner: "",
  sampling: "", location_type: "", location_smpl: "", is_vaccinated: "Tidak Diketahui",
  test_services: [],
};

// Filter specimens berdasarkan specimen_group yang dipilih
const getSpecimensByGroup = (groupName) => {
  const group = SPECIMEN_GROUPS.find(g => g.name === groupName);
  if (!group) return SPECIMENS;
  return SPECIMENS.filter(s => s.group_id === group.id);
};

// Filter animals berdasarkan kingdom dari specimen_group
const getAnimalsByGroup = (groupName) => {
  const group = SPECIMEN_GROUPS.find(g => g.name === groupName);
  if (!group) return ANIMALS;
  return ANIMALS.filter(a => a.kingdom === group.kingdom);
};

/* ─── Download template CSV ─── */
const TEMPLATE_HEADERS = [
  "Kode Sampel","Model Sampel","Specimen Group","Specimen",
  "Hewan / Species","Pengawet","Kemasan","Tanggal Produksi",
  "Tanggal Kadaluarsa","Jenis Kelamin","Umur","Unit Umur",
  "Pemilik Hewan","Jenis Uji","Jenis Lokasi","Lokasi Sampel","Telah Divaksin",
];

const downloadTemplate = async () => {
  try {
    const res = await apiFetch("/customer/submissions/samples/template");
    if (res.ok) {
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "template_input_sample.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
  } catch {}
  // Fallback: CSV sederhana
  const csvContent = TEMPLATE_HEADERS.join(",") + "\n";
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "template_input_sample.csv";
  a.click();
  URL.revokeObjectURL(url);
};

/* ─── Parse CSV yang diupload ─── */
const parseExcelFile = (file, cartItems, callback) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text  = e.target.result;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { callback(null, "File kosong atau tidak valid."); return; }
      const rows = lines.slice(1).map(line => {
        const cols = [];
        let current = "", inQuote = false;
        for (const ch of line) {
          if (ch === '"') inQuote = !inQuote;
          else if (ch === "," && !inQuote) { cols.push(current.trim()); current = ""; }
          else current += ch;
        }
        cols.push(current.trim());
        return cols;
      }).filter(r => r[0]);
      const samples = rows.map(r => ({
        sample_code_cust: r[0]  ?? "",
        sample_model:     r[1]  ?? "",
        specimen_group:   r[2]  ?? "",
        specimen_type:    r[3]  ?? "",
        species:          r[4]  ?? "",
        preservative:     r[5]  ?? "",
        packaging:        r[6]  ?? "",
        production_date:  r[7]  ?? "",
        expired_date:     r[8]  ?? "",
        sex:              r[9]  ?? "",
        age:              r[10] ?? "",
        unit_age:         r[11] ?? "bulan",
        owner:            r[12] ?? "",
        jenis_uji_text:   r[13] ?? "",
        location_type:    r[14] ?? "",
        location_smpl:    r[15] ?? "",
        is_vaccinated:    r[16] ?? "Tidak Diketahui",
        test_services:    [],
        sampling:         "",
      }));
      callback(samples, null);
    } catch (err) {
      callback(null, "Gagal membaca file: " + err.message);
    }
  };
  reader.readAsText(file, "UTF-8");
};

/* ─── Helper komponen ─── */
const STEP_ICONS = [
  // Icon dokumen/pengajuan
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>,
  // Icon sampel/refresh
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>,
  // Icon pelanggan
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>,
];

function StepBar({ step }) {
  const steps = ["Data Pengajuan", "Data Sampel", "Data Pelanggan"];
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((s, i) => {
        const n      = i + 1;
        const done   = step > n;
        const active = step === n;
        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center
                border-2 transition-all
                ${done   ? "bg-[#233B6E] border-[#233B6E] text-white"
                : active ? "bg-white border-[#233B6E] text-[#233B6E]"
                         : "bg-white border-gray-200 text-gray-300"}`}>
                {done
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                      strokeLinecap="round" className="w-5 h-5">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  : STEP_ICONS[i]
                }
              </div>
              <span className={`text-xs whitespace-nowrap font-semibold
                ${active || done ? "text-[#233B6E]" : "text-gray-400"}`}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-20 mx-3 mb-6 transition-colors
                ${step > n ? "bg-[#233B6E]" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-[#233B6E]">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", disabled }) {
  return (
    <input type={type} value={value ?? ""} onChange={onChange}
      placeholder={placeholder} disabled={disabled}
      className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none
        transition placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-500
        focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]" />
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select value={value ?? ""} onChange={onChange}
        className="w-full appearance-none border border-gray-300 rounded-xl px-3 py-2.5
          text-sm outline-none bg-white pr-9 text-gray-800
          focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]">
        <option value="">{placeholder ?? "Pilih..."}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round"
        className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2
          text-gray-400 pointer-events-none">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  );
}

/* ─── SearchableSelect untuk data banyak (specimen, animal) ─── */
function SearchableSelect({ value, onChange, options, placeholder, labelKey = "name" }) {
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState("");
  const ref                   = useRef(null);

  const filtered = search
    ? options.filter(o => o[labelKey].toLowerCase().includes(search.toLowerCase())).slice(0, 50)
    : options.slice(0, 80);

  const selected = options.find(o => o[labelKey] === value);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => { setOpen(p => !p); setSearch(""); }}
        className="w-full flex items-center justify-between border border-gray-300
          rounded-xl px-3 py-2.5 text-sm bg-white outline-none text-left
          focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E] transition">
        <span className={selected ? "text-gray-800" : "text-gray-400"}>
          {selected ? selected[labelKey] : placeholder}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" className="w-4 h-4 text-gray-400 flex-shrink-0">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200
          rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari..."
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm
                outline-none focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]"/>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-gray-400
                hover:bg-gray-50 transition">
              -- Pilih --
            </button>
            {filtered.map((o, i) => (
              <button key={i} type="button"
                onClick={() => { onChange(o[labelKey]); setOpen(false); setSearch(""); }}
                className={`w-full text-left px-3 py-2 text-sm transition
                  ${o[labelKey] === value
                    ? "bg-[#EEF0F8] text-[#233B6E] font-semibold"
                    : "hover:bg-gray-50 text-gray-800"}`}>
                {o[labelKey]}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-sm text-gray-400 text-center">Tidak ditemukan</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MultiSelect untuk jenis pengujian ─── */
function MultiSelectPengujian({ selected, onChange, cartItems }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref                 = useRef(null);

  const filtered = search
    ? cartItems.filter(s => s.test_name?.toLowerCase().includes(search.toLowerCase()))
    : cartItems;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (svc) => {
    const has = selected.some(x => x.id === svc.id);
    onChange(has ? selected.filter(x => x.id !== svc.id) : [...selected, svc]);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button type="button" onClick={() => { setOpen(p => !p); setSearch(""); }}
        className="w-full flex items-center justify-between border border-gray-300
          rounded-xl px-3 py-2.5 text-sm bg-white outline-none text-left
          focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E] transition min-h-[42px]">
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {selected.length === 0
            ? <span className="text-gray-400">Pilih jenis pengujian...</span>
            : selected.map(s => (
                <span key={s.id}
                  className="inline-flex items-center gap-1 bg-[#EEF0F8] text-[#233B6E]
                    text-xs font-semibold px-2 py-0.5 rounded-full">
                  {s.test_name}
                  <span onClick={e => { e.stopPropagation(); toggle(s); }}
                    className="hover:text-red-500 cursor-pointer leading-none">×</span>
                </span>
              ))
          }
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200
          rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari jenis pengujian..."
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm
                outline-none focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]"/>
          </div>
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-gray-400 text-center">
              {cartItems.length === 0 ? "Keranjang kosong" : "Tidak ditemukan"}
            </p>
          ) : (
            <div className="max-h-52 overflow-y-auto">
              {filtered.map(svc => {
                const checked = selected.some(x => x.id === svc.id);
                return (
                  <button key={svc.id} type="button" onClick={() => toggle(svc)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left
                      text-sm transition
                      ${checked ? "bg-[#EEF0F8]" : "hover:bg-gray-50"}`}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center
                      justify-center flex-shrink-0 transition
                      ${checked ? "bg-[#233B6E] border-[#233B6E]" : "border-gray-300"}`}>
                      {checked && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"
                          strokeLinecap="round" className="w-2.5 h-2.5">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#233B6E] truncate">{svc.test_name}</p>
                      {svc.unit_lab && (
                        <p className="text-xs text-gray-400">{svc.unit_lab}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="px-3 py-2 border-t border-gray-100 text-right">
            <button type="button" onClick={() => setOpen(false)}
              className="text-xs font-bold text-[#233B6E] hover:underline">
              Selesai ({selected.length} dipilih)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Wilayah Bertingkat ─── */
const WILAYAH_API = "https://emsifa.github.io/api-wilayah-indonesia/api";

function WilayahSelect({ step3, setStep3 }) {
  const [provinces,   setProvinces]   = useState([]);
  const [regencies,   setRegencies]   = useState([]);
  const [districts,   setDistricts]   = useState([]);
  const [villages,    setVillages]    = useState([]);

  const [loadingProv, setLoadingProv] = useState(false);
  const [loadingReg,  setLoadingReg]  = useState(false);
  const [loadingDist, setLoadingDist] = useState(false);
  const [loadingVil,  setLoadingVil]  = useState(false);

  // Selected IDs untuk trigger fetch berikutnya
  const [provId,  setProvId]  = useState("");
  const [regId,   setRegId]   = useState("");
  const [distId,  setDistId]  = useState("");

  // Load provinsi saat mount
  useEffect(() => {
    setLoadingProv(true);
    fetch(`${WILAYAH_API}/provinces.json`)
      .then(r => r.json())
      .then(d => setProvinces(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
      .finally(() => setLoadingProv(false));
  }, []);

  // Load kabupaten saat provinsi dipilih
  useEffect(() => {
    if (!provId) { setRegencies([]); setDistricts([]); setVillages([]); return; }
    setLoadingReg(true);
    setRegencies([]); setDistricts([]); setVillages([]);
    fetch(`${WILAYAH_API}/regencies/${provId}.json`)
      .then(r => r.json())
      .then(d => setRegencies(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
      .finally(() => setLoadingReg(false));
  }, [provId]);

  // Load kecamatan saat kabupaten dipilih
  useEffect(() => {
    if (!regId) { setDistricts([]); setVillages([]); return; }
    setLoadingDist(true);
    setDistricts([]); setVillages([]);
    fetch(`${WILAYAH_API}/districts/${regId}.json`)
      .then(r => r.json())
      .then(d => setDistricts(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
      .finally(() => setLoadingDist(false));
  }, [regId]);

  // Load kelurahan saat kecamatan dipilih
  useEffect(() => {
    if (!distId) { setVillages([]); return; }
    setLoadingVil(true);
    setVillages([]);
    fetch(`${WILAYAH_API}/villages/${distId}.json`)
      .then(r => r.json())
      .then(d => setVillages(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
      .finally(() => setLoadingVil(false));
  }, [distId]);

  const getCode = (o) => o.code ?? o.id ?? "";

  const handleProvince = (e) => {
    const id   = e.target.value;
    const name = provinces.find(p => getCode(p) === id)?.name ?? "";
    setProvId(id);
    setRegId(""); setDistId("");
    setStep3(p => ({ ...p, province: name, city: "", subdistrict: "", village: "" }));
  };

  const handleRegency = (e) => {
    const id   = e.target.value;
    const name = regencies.find(r => getCode(r) === id)?.name ?? "";
    setRegId(id);
    setDistId("");
    setStep3(p => ({ ...p, city: name, subdistrict: "", village: "" }));
  };

  const handleDistrict = (e) => {
    const id   = e.target.value;
    const name = districts.find(d => getCode(d) === id)?.name ?? "";
    setDistId(id);
    setStep3(p => ({ ...p, subdistrict: name, village: "" }));
  };

  const handleVillage = (e) => {
    const name = villages.find(v => getCode(v) === e.target.value)?.name ?? "";
    setStep3(p => ({ ...p, village: name }));
  };

  const WilayahDropdown = ({ label, required, value, onChange, options, loading, disabled, placeholder }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-[#233B6E]">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          value={(() => { const f = options.find(o => o.name === value); return f ? (f.code ?? f.id ?? "") : ""; })()}
          onChange={onChange}
          disabled={disabled || loading}
          className="w-full appearance-none border border-gray-300 rounded-xl px-3 py-2.5
            text-sm outline-none bg-white pr-9 text-gray-800
            focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]
            disabled:bg-gray-50 disabled:text-gray-400 transition">
          <option value="">
            {loading ? "Memuat..." : disabled ? "Pilih sebelumnya dulu" : placeholder}
          </option>
          {options.map(o => (
            <option key={o.code ?? o.id} value={o.code ?? o.id}>{o.name}</option>
          ))}
        </select>
        {loading
          ? <svg className="animate-spin w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2
              text-[#233B6E] pointer-events-none" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round"
              className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2
                text-gray-400 pointer-events-none">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
        }
      </div>
    </div>
  );

  return (
    <>
      <WilayahDropdown
        label="Provinsi" required
        value={step3.province}
        onChange={handleProvince}
        options={provinces}
        loading={loadingProv}
        disabled={false}
        placeholder="Pilih provinsi"
      />
      <WilayahDropdown
        label="Kabupaten/Kota" required
        value={step3.city}
        onChange={handleRegency}
        options={regencies}
        loading={loadingReg}
        disabled={!provId}
        placeholder="Pilih kabupaten/kota"
      />
      <WilayahDropdown
        label="Kecamatan" required
        value={step3.subdistrict}
        onChange={handleDistrict}
        options={districts}
        loading={loadingDist}
        disabled={!regId}
        placeholder="Pilih kecamatan"
      />
      <WilayahDropdown
        label="Kelurahan/Desa" required
        value={step3.village}
        onChange={handleVillage}
        options={villages}
        loading={loadingVil}
        disabled={!distId}
        placeholder="Pilih kelurahan/desa"
      />
    </>
  );
}

function NavButtons({ step, onBack, onNext, onSubmit, submitting, isLastStep }) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
      <p className="text-xs text-gray-400 italic">
        {isLastStep
          ? "Silahkan periksa kembali data yang dimasukkan sebelum pengajuan"
          : `Silahkan isi data ${step === 1 ? "pengajuan" : step === 2 ? "sampel" : "pelanggan"} untuk lanjut ke tahap berikutnya`
        }
      </p>
      <div className="flex gap-2">
        {step > 1 && (
          <button onClick={onBack}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-600
              hover:bg-gray-100 text-sm font-semibold px-4 py-2 rounded-xl transition-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Kembali
          </button>
        )}
        {!isLastStep ? (
          <button onClick={onNext}
            className="flex items-center gap-1.5 bg-[#233B6E] hover:bg-[#1a2d56]
              text-white text-sm font-bold px-5 py-2 rounded-xl transition-all">
            Lanjut
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" className="w-4 h-4">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        ) : (
          <button onClick={onSubmit} disabled={submitting}
            className="flex items-center gap-1.5 bg-[#233B6E] hover:bg-[#1a2d56]
              text-white text-sm font-bold px-6 py-2 rounded-xl transition-all
              disabled:opacity-60 disabled:cursor-not-allowed">
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Mengirim...
              </>
            ) : "Ajukan"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
export default function PengajuanUjiSampel() {
  const navigate  = useNavigate();
  const user      = getUser();
  const cartItems = getCart();

  const [step, setStep]             = useState(1);
  const [error, setError]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Dokumen pendukung (attachment_doc)
  const [docFiles, setDocFiles] = useState([]);

  // Step 1 — Data Pengajuan
  const [step1, setStep1] = useState({
    type_service:      "",
    purpose_of_test:   "",
    date_of_send:      "",
    courier_name:      "",
    courier_contact:   "",
    diagnosis_required: false,
    notes:             "",
  });

  // Step 2 — Data Sampel
  const [samples, setSamples]       = useState([{ ...EMPTY_SAMPLE }]);
  const [parseMsg, setParseMsg]     = useState("");
  const [showImport, setShowImport] = useState(false);
  const xlsxRef                     = useRef();

  // Step 3 — Data Pelanggan
  const [profile, setProfile] = useState(null);
  const [step3, setStep3]     = useState({
    fullname: "", phone: "", institution: "", address: "",
    province: "", city: "", subdistrict: "", village: "",
    zip_code: "", pic_name: "", pic_contact: "",
  });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const res  = await apiFetch("/profile");
      const data = await res.json();
      const p    = data.profile ?? data;
      const c    = p.customer ?? {};
      setProfile(p);
      setStep3({
        fullname:    p.fullname      ?? "",
        phone:       p.phone         ?? "",
        institution: p.institution   ?? "",
        address:     c.address       ?? "",
        province:    c.province      ?? "",
        city:        c.city          ?? "",
        subdistrict: c.subdistrict   ?? "",
        village:     c.village       ?? "",
        zip_code:    c.zip_code      ?? "",
        pic_name:    c.pic_name      ?? "",
        pic_contact: c.pic_contact   ?? "",
      });
    } catch {}
  };

  const setS1 = (k) => (e) =>
    setStep1(p => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const setS3 = (k) => (e) => setStep3(p => ({ ...p, [k]: e.target.value }));

  /* ── Sample helpers ── */
  const setSample    = (i, k, v) => setSamples(prev => {
    const next = [...prev]; next[i] = { ...next[i], [k]: v }; return next;
  });
  const addSample    = () => setSamples(p => [...p, { ...EMPTY_SAMPLE }]);
  const removeSample = (i) => setSamples(p => p.filter((_, idx) => idx !== i));

  const toggleTestService = (sampleIdx, svc) => {
    setSamples(prev => {
      const next = [...prev];
      const cur  = next[sampleIdx].test_services ?? [];
      const has  = cur.find(x => x.id === svc.id);
      next[sampleIdx] = {
        ...next[sampleIdx],
        test_services: has ? cur.filter(x => x.id !== svc.id) : [...cur, svc],
      };
      return next;
    });
  };

  /* ── Validasi ── */
  const validate = () => {
    if (step === 1) {
      if (!step1.type_service)    return "Jenis layanan wajib dipilih.";
      if (!step1.purpose_of_test) return "Tujuan pengujian wajib dipilih.";
      if (!step1.date_of_send)    return "Tanggal kirim wajib diisi.";
    }
    if (step === 2) {
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        if (!s.sample_code_cust)      return `Sampel ${i+1}: Kode sampel wajib diisi.`;
        if (!s.sample_model)          return `Sampel ${i+1}: Model sampel wajib dipilih.`;
        if (!s.specimen_group)        return `Sampel ${i+1}: Kelompok spesimen wajib dipilih.`;
        if (!s.specimen_type)         return `Sampel ${i+1}: Jenis spesimen wajib dipilih.`;
        if (!s.species)               return `Sampel ${i+1}: Hewan/Species wajib dipilih.`;
        if (!s.test_services?.length) return `Sampel ${i+1}: Pilih minimal 1 jenis pengujian.`;
      }
    }
    if (step === 3) {
      if (!step3.fullname)    return "Nama lengkap wajib diisi.";
      if (!step3.phone)       return "No. telepon wajib diisi.";
      if (!step3.institution) return "Institusi/Perusahaan wajib diisi.";
      if (!step3.address)     return "Alamat wajib diisi.";
      if (!step3.province)    return "Provinsi wajib dipilih.";
      if (!step3.city)        return "Kabupaten/Kota wajib dipilih.";
      if (!step3.subdistrict) return "Kecamatan wajib dipilih.";
      if (!step3.village)     return "Kelurahan/Desa wajib dipilih.";
    }
    return null;
  };

  const handleNext = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    if (step < 3) setStep(s => s + 1);
    else setShowPreview(true);
  };

  const handleBack = () => {
    setError("");
    if (showPreview) setShowPreview(false);
    else setStep(s => s - 1);
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    setSubmitting(true); setError("");
    try {
      const fd = new FormData();
      // Field teks step 1
      fd.append("type_service",      step1.type_service);
      fd.append("purpose_of_test",   step1.purpose_of_test);
      fd.append("date_of_send",      step1.date_of_send);
      if (step1.courier_name)    fd.append("courier_name",    step1.courier_name);
      if (step1.courier_contact) fd.append("courier_contact", step1.courier_contact);
      fd.append("diagnosis_required", String(step1.diagnosis_required));
      if (step1.notes)           fd.append("notes",           step1.notes);
      fd.append("samples_count", String(samples.reduce((a, s) =>
        a + (Number(s.total_sample) || 1), 0)));

      // Samples sebagai JSON
      fd.append("samples", JSON.stringify(samples.map(s => ({
        sample_code_cust: s.sample_code_cust,
        sample_model:     s.sample_model,
        specimen_group:   s.specimen_group,
        specimen_type:    s.specimen_type,
        species:          s.species,
        preservative:     s.preservative,
        packaging:        s.packaging,
        production_date:  s.production_date,
        expired_date:     s.expired_date,
        sex:              s.sex,
        age:              s.age ? Number(s.age) : undefined,
        unit_age:         s.unit_age,
        owner:            s.owner,
        sampling:         s.sampling,
        location_type:    s.location_type,
        location_smpl:    s.location_smpl,
        is_vaccinated:    s.is_vaccinated,
        test_services:    s.test_services?.map(t => t.id),
      }))));

      // Dokumen pendukung
      docFiles.forEach(f => fd.append("attachment_doc", f));

      const res = await apiFetch("/customer/submissions", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? d.message ?? "Gagal mengirim pengajuan.");
      }

      clearCart();
      navigate("/customer/pengajuan-saya");
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── PREVIEW ─── */
  if (showPreview) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <h1 className="text-xl font-bold text-[#233B6E]">Pengajuan Uji Sampel</h1>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-[#233B6E]" />
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <button onClick={handleBack}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" className="w-4 h-4"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <h2 className="font-bold text-[#233B6E]">Pratinjau Pengajuan Sampel</h2>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600
                text-sm rounded-xl px-4 py-3">{error}</div>
            )}

            {/* Data Pengajuan */}
            <section>
              <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-3">
                Data Pengajuan
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Jenis Layanan",      val: step1.type_service },
                  { label: "Tujuan Pengujian",   val: step1.purpose_of_test },
                  { label: "Tanggal Kirim",       val: step1.date_of_send },
                                  { label: "Nama Kurir",          val: step1.courier_name || "-" },
                  { label: "Kontak Kurir",        val: step1.courier_contact || "-" },
                  { label: "Perlu Diagnosis",     val: step1.diagnosis_required ? "Ya" : "Tidak" },
                  { label: "Catatan",             val: step1.notes || "-" },
                ].map(r => (
                  <div key={r.label}>
                    <p className="text-xs text-gray-400">{r.label}</p>
                    <p className="font-semibold text-[#233B6E] mt-0.5">{r.val}</p>
                  </div>
                ))}
                {docFiles.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-1">Dokumen Pendukung</p>
                    <div className="flex flex-wrap gap-1.5">
                      {docFiles.map((f, i) => (
                        <span key={i} className="text-xs bg-[#EEF0F8] text-[#233B6E]
                          font-medium px-2.5 py-1 rounded-full">{f.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Data Sampel */}
            <section className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-3">
                Data Sampel ({samples.length} sampel)
              </p>
              {samples.map((s, i) => (
                <div key={i} className="bg-[#F6F7FB] rounded-xl p-3 mb-2 text-sm">
                  <p className="font-bold text-[#233B6E] mb-2">Sampel {i+1}: {s.sample_code_cust}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Model Sampel",   val: s.sample_model },
                      { label: "Species/Hewan",  val: s.species },
                      { label: "Jenis Spesimen", val: s.specimen_type },
                      { label: "Pengawet",       val: s.preservative },
                    ].map(r => (
                      <div key={r.label}>
                        <p className="text-[11px] text-gray-400">{r.label}</p>
                        <p className="font-medium text-[#233B6E]">{r.val || "-"}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.test_services?.map(t => (
                      <span key={t.id} className="bg-[#233B6E]/10 text-[#233B6E]
                        text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {t.test_name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            {/* Data Pelanggan */}
            <section className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-[#415F9D] uppercase tracking-wider mb-3">
                Data Pelanggan
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Nama Lengkap",  val: step3.fullname },
                  { label: "No. Telepon",   val: step3.phone },
                  { label: "Institusi",     val: step3.institution },
                  { label: "Alamat",        val: step3.address || "-" },
                  { label: "Kota",          val: step3.city || "-" },
                  { label: "Provinsi",      val: step3.province || "-" },
                ].map(r => (
                  <div key={r.label}>
                    <p className="text-xs text-gray-400">{r.label}</p>
                    <p className="font-semibold text-[#233B6E] mt-0.5">{r.val}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 italic">
            Silahkan periksa kembali data yang dimasukkan sebelum pengajuan
          </p>
          <div className="flex gap-2">
            <button onClick={handleBack}
              className="border border-gray-300 text-gray-600 hover:bg-gray-100
                text-sm font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-4 h-4"><path d="M15 18l-6-6 6-6"/></svg>
              Kembali
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="bg-[#233B6E] hover:bg-[#1a2d56] text-white font-bold
                text-sm px-6 py-2 rounded-xl transition-all disabled:opacity-60
                flex items-center gap-1.5">
              {submitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Mengirim...
                </>
              ) : "Ajukan"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── STEP FORMS ─── */
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-[#233B6E]">Pengajuan Uji Sampel</h1>

      {/* Card Step Indicator — terpisah */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <StepBar step={step} />
      </div>

      {/* Card Formulir */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-1 bg-[#233B6E]" />
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600
              text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
          )}

          {/* ── STEP 1: Data Pengajuan ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-bold text-[#233B6E]">1. Formulir Data Pengajuan</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Jenis Layanan" required>
                  <Select value={step1.type_service}
                    onChange={setS1("type_service")}
                    options={TYPE_SERVICE}
                    placeholder="Pilih jenis layanan" />
                </Field>
                <Field label="Tujuan Pengujian" required>
                  <Select value={step1.purpose_of_test}
                    onChange={setS1("purpose_of_test")}
                    options={PURPOSE}
                    placeholder="Pilih tujuan pengujian" />
                </Field>
                <Field label="Tanggal Kirim" required>
                  <Input type="date" value={step1.date_of_send}
                    onChange={setS1("date_of_send")} />
                </Field>

                <Field label="Nama Kurir">
                  <Input value={step1.courier_name}
                    onChange={setS1("courier_name")}
                    placeholder="cth: JNE, TIKI, Pribadi" />
                </Field>
                <Field label="Kontak Kurir">
                  <Input value={step1.courier_contact}
                    onChange={setS1("courier_contact")}
                    placeholder="No. HP kurir" />
                </Field>
                <Field label="Perlu Diagnosis">
                  <div className="flex items-center gap-3 h-10">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox"
                        checked={step1.diagnosis_required}
                        onChange={setS1("diagnosis_required")}
                        className="w-4 h-4 accent-[#233B6E] cursor-pointer" />
                      <span className="text-sm text-gray-700">
                        Ya, diperlukan diagnosis
                      </span>
                    </label>
                  </div>
                </Field>
              </div>

              <Field label="Catatan">
                <textarea value={step1.notes} onChange={setS1("notes")}
                  rows={3} placeholder="Catatan tambahan (opsional)..."
                  className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                    outline-none resize-none transition placeholder-gray-400
                    focus:ring-2 focus:ring-[#233B6E]/25 focus:border-[#233B6E]" />
              </Field>

              <Field label="Dokumen Pendukung"
                hint="Upload surat pengantar, dokumen kesehatan hewan, dll (PDF/JPG/PNG, maks 5MB tiap file)">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 border border-dashed
                    border-gray-300 rounded-xl px-4 py-3 cursor-pointer
                    hover:border-[#233B6E] hover:text-[#233B6E] text-gray-400
                    text-sm transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                      className="w-4 h-4 flex-shrink-0">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <span>Pilih file dokumen pendukung...</span>
                    <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files);
                        setDocFiles(p => [...p, ...files]);
                        e.target.value = "";
                      }} />
                  </label>
                  {docFiles.length > 0 && (
                    <div className="space-y-1.5">
                      {docFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between
                          bg-[#F6F7FB] rounded-lg px-3 py-2 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#233B6E"
                              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                              className="w-4 h-4 flex-shrink-0">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12
                                a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <span className="text-[#233B6E] font-medium truncate">{f.name}</span>
                            <span className="text-gray-400 text-xs flex-shrink-0">
                              ({(f.size / 1024).toFixed(0)} KB)
                            </span>
                          </div>
                          <button onClick={() =>
                            setDocFiles(p => p.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-600 transition-colors ml-2">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                              strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                              <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            </div>
          )}

          {/* ── STEP 2: Data Sampel ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-bold text-[#233B6E]">2. Formulir Data Sampel</h2>
                {cartItems.length === 0 && (
                  <span className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-full">
                    Keranjang kosong — tambah pengujian dari katalog
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500">
                Masukkan sampel (untuk multi sampel, jumlah sampel = jumlah baris/template).
              </p>

              <div className="border border-gray-200 rounded-xl px-4 py-3
                flex items-center justify-between gap-3 flex-wrap">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={showImport}
                    onChange={e => setShowImport(e.target.checked)}
                    className="w-4 h-4 accent-[#233B6E] cursor-pointer" />
                  <span className="text-sm text-gray-600">
                    Memasukkan sampel dengan jumlah banyak (unggah template)
                  </span>
                </label>
                {showImport && (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={downloadTemplate}
                      className="flex items-center gap-1.5 bg-[#EEF0F8]
                        hover:bg-[#dde0ee] text-[#233B6E] text-xs font-bold
                        px-4 py-2 rounded-xl transition-colors border border-[#233B6E]/20">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="w-3.5 h-3.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Unduh
                    </button>
                    <button type="button" onClick={() => xlsxRef.current.click()}
                      className="flex items-center gap-1.5 bg-[#233B6E]
                        hover:bg-[#1a2d56] text-white text-xs font-bold
                        px-4 py-2 rounded-xl transition-colors shadow-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="w-3.5 h-3.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Unggah
                    </button>
                    <input ref={xlsxRef} type="file" accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setParseMsg("Membaca file...");
                        parseExcelFile(file, cartItems, (parsed, err) => {
                          if (err) { setParseMsg("✗ " + err); return; }
                          setSamples(parsed.length > 0 ? parsed : [{ ...EMPTY_SAMPLE }]);
                          setParseMsg(`✓ ${parsed.length} sampel berhasil diimpor.`);
                        });
                        e.target.value = "";
                      }} />
                  </div>
                )}
              </div>

              {parseMsg && (
                <p className={`text-xs font-medium px-1
                  ${parseMsg.startsWith("✓") ? "text-green-600"
                  : parseMsg.startsWith("✗") ? "text-red-500"
                  : "text-gray-500"}`}>
                  {parseMsg}
                </p>
              )}

              {samples.map((s, i) => (
                <div key={i} className="border border-gray-200 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#233B6E] text-sm">Sampel {i + 1}</h3>
                    {samples.length > 1 && (
                      <button onClick={() => removeSample(i)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium
                          flex items-center gap-1 transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                          className="w-3.5 h-3.5">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                        </svg>
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Kode Sampel Pelanggan" required>
                      <Input value={s.sample_code_cust}
                        onChange={e => setSample(i, "sample_code_cust", e.target.value)}
                        placeholder="Masukkan kode sampel Anda" />
                    </Field>
                    <Field label="Model Sampel" required>
                      <Select value={s.sample_model}
                        onChange={e => setSample(i, "sample_model", e.target.value)}
                        options={SAMPLE_MODELS}
                        placeholder="Silahkan pilih model sampel Anda" />
                    </Field>
                    <Field label="Total Sampel">
                      <Input value={s.total_sample}
                        onChange={e => setSample(i, "total_sample", e.target.value)}
                        type="number" placeholder="Jumlah total sampel" />
                    </Field>
                    <Field label="Kelompok Spesimen (Specimen Group)" required>
                      <Select value={s.specimen_group}
                        onChange={e => {
                          setSample(i, "specimen_group", e.target.value);
                          setSample(i, "specimen_type", "");
                          setSample(i, "species", "");
                        }}
                        options={SPECIMEN_GROUPS.map(g => g.name)}
                        placeholder="Pilih kelompok spesimen dulu" />
                    </Field>
                    <Field label="Jenis Spesimen (Specimen)" required
                      hint={!s.specimen_group ? "Pilih kelompok spesimen dulu" : ""}>
                      <SearchableSelect
                        value={s.specimen_type}
                        onChange={v => setSample(i, "specimen_type", v)}
                        options={getSpecimensByGroup(s.specimen_group)}
                        placeholder={!s.specimen_group ? "Pilih kelompok spesimen dulu" : "Pilih jenis spesimen..."}
                        labelKey="name"
                      />
                    </Field>
                    <Field label="Hewan / Species" required
                      hint={!s.specimen_group ? "Pilih kelompok spesimen dulu" : ""}>
                      <SearchableSelect
                        value={s.species}
                        onChange={v => setSample(i, "species", v)}
                        options={getAnimalsByGroup(s.specimen_group)}
                        placeholder={!s.specimen_group ? "Pilih kelompok spesimen dulu" : "Pilih hewan / species..."}
                        labelKey="name"
                      />
                    </Field>
                    <Field label="Pengawet">
                      <Select value={s.preservative}
                        onChange={e => setSample(i, "preservative", e.target.value)}
                        options={PRESERVATIVES}
                        placeholder="Pilih pengawet" />
                    </Field>
                    <Field label="Kemasan">
                      <Select value={s.packaging}
                        onChange={e => setSample(i, "packaging", e.target.value)}
                        options={PACKAGES}
                        placeholder="Pilih kemasan" />
                    </Field>
                    <Field label="Tanggal Produksi">
                      <Input type="date" value={s.production_date}
                        onChange={e => setSample(i, "production_date", e.target.value)} />
                    </Field>
                    <Field label="Tanggal Kadaluarsa">
                      <Input type="date" value={s.expired_date}
                        onChange={e => setSample(i, "expired_date", e.target.value)} />
                    </Field>
                    <Field label="Jenis Kelamin">
                      <Select value={s.sex}
                        onChange={e => setSample(i, "sex", e.target.value)}
                        options={SEXES_LIST}
                        placeholder="Pilih jenis kelamin" />
                    </Field>
                    <Field label="Umur">
                      <div className="flex gap-2">
                        <Input value={s.age}
                          onChange={e => setSample(i, "age", e.target.value)}
                          type="number" placeholder="Umur" />
                        <div className="w-32">
                          <Select value={s.unit_age}
                            onChange={e => setSample(i, "unit_age", e.target.value)}
                            options={UNIT_AGES} placeholder="" />
                        </div>
                      </div>
                    </Field>
                    <Field label="Pemilik Hewan">
                      <Input value={s.owner}
                        onChange={e => setSample(i, "owner", e.target.value)}
                        placeholder="Nama pemilik hewan" />
                    </Field>
                    <Field label="Telah Divaksin">
                      <Select value={s.is_vaccinated}
                        onChange={e => setSample(i, "is_vaccinated", e.target.value)}
                        options={VACCINATED}
                        placeholder="Status vaksinasi" />
                    </Field>
                    <Field label="Lokasi Pengambilan">
                      <Input value={s.location_smpl}
                        onChange={e => setSample(i, "location_smpl", e.target.value)}
                        placeholder="cth: Bandar Lampung" />
                    </Field>
                    <Field label="Jenis Lokasi">
                      <Select value={s.location_type}
                        onChange={e => setSample(i, "location_type", e.target.value)}
                        options={LOCATION_TYPES}
                        placeholder="Pilih jenis lokasi" />
                    </Field>
                  </div>

                  <Field label="Jenis Pengujian Sampel" required
                    hint={cartItems.length === 0 ? "Keranjang kosong — tambah dari katalog dulu" : `${cartItems.length} pengujian tersedia dari keranjang`}>
                    {cartItems.length === 0 ? (
                      <div className="border border-dashed border-gray-300 rounded-xl p-4
                        text-center text-sm text-gray-400">
                        Keranjang kosong.{" "}
                        <button onClick={() => navigate("/customer/katalog-pengujian")}
                          className="text-[#233B6E] font-semibold hover:underline">
                          Tambah dari katalog
                        </button>
                      </div>
                    ) : (
                      <MultiSelectPengujian
                        selected={s.test_services ?? []}
                        onChange={v => setSample(i, "test_services", v)}
                        cartItems={cartItems}
                      />
                    )}
                  </Field>
                </div>
              ))}

              <button onClick={addSample}
                className="w-full border-2 border-dashed border-[#233B6E]/30
                  hover:border-[#233B6E] text-[#233B6E] text-sm font-semibold
                  py-3 rounded-2xl transition-all flex items-center justify-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" className="w-4 h-4">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Tambah Sampel
              </button>
            </div>
          )}

          {/* ── STEP 3: Data Pelanggan ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-bold text-[#233B6E]">3. Formulir Data Pelanggan</h2>
              <p className="text-xs text-gray-500">
                Data diambil dari profil Anda. Field yang masih kosong harap dilengkapi.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nama Lengkap/Perusahaan" required>
                  <Input value={step3.fullname} onChange={setS3("fullname")}
                    placeholder="Nama lengkap" />
                </Field>
                <Field label="Email">
                  <Input value={profile?.email ?? ""} disabled />
                </Field>
                <Field label="No. Telepon" required>
                  <Input value={step3.phone} onChange={setS3("phone")}
                    placeholder="08XXXXXXXXXX" />
                </Field>
                <Field label="Institusi/Perusahaan" required>
                  <Input value={step3.institution} onChange={setS3("institution")}
                    placeholder="Nama institusi atau perusahaan" />
                </Field>
                <Field label="Alamat" required>
                  <Input value={step3.address} onChange={setS3("address")}
                    placeholder="Alamat lengkap" />
                </Field>
                <Field label="Kode Pos">
                  <Input value={step3.zip_code} onChange={setS3("zip_code")}
                    placeholder="cth: 35141" />
                </Field>
                <WilayahSelect step3={step3} setStep3={setStep3} />
                <Field label="Nama PIC">
                  <Input value={step3.pic_name} onChange={setS3("pic_name")}
                    placeholder="Nama narahubung" />
                </Field>
                <Field label="Kontak PIC">
                  <Input value={step3.pic_contact} onChange={setS3("pic_contact")}
                    placeholder="No. HP narahubung" />
                </Field>
              </div>
            </div>
          )}

          <NavButtons
            step={step}
            onBack={handleBack}
            onNext={handleNext}
            onSubmit={handleSubmit}
            submitting={submitting}
            isLastStep={false}
          />
        </div>
      </div>
    </div>
  );
}