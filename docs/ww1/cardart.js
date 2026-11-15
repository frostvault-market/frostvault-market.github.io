// صور الكروت: صور حقيقية من Wikimedia Commons (مع ذكر المصدر) + صور مرسومة من موديلات اللعبة
const PHOTOS = {
"a7v": {
"f": "img/cards/a7v.jpg",
"r": 1
},
"kwagen": {
"f": "img/cards/kwagen.jpg",
"r": 1
},
"lk1": {
"f": "img/cards/lk1.jpg",
"r": 1
},
"lk2": {
"f": "img/cards/lk2.jpg",
"r": 1
},
"lk3": {
"f": "img/cards/lk3.jpg",
"r": 1
},
"dw1": {
"f": "img/cards/dw1.jpg",
"r": 1
},
"dw2": {
"f": "img/cards/dw2.jpg",
"r": 1
},
"gross": {
"f": "img/cards/gross.jpg",
"r": 1
},
"mk4m": {
"f": "img/cards/mk4m.jpg",
"r": 1
},
"mk4f": {
"f": "img/cards/mk4f.jpg",
"r": 1
},
"ft": {
"f": "img/cards/ft.jpg",
"r": 1
},
"whippet": {
"f": "img/cards/whippet.jpg",
"r": 1
},
"ca1": {
"f": "img/cards/ca1.jpg",
"r": 1
},
"stchamond": {
"f": "img/cards/stchamond.jpg",
"r": 1
},
"car": {
"f": "img/cards/car.jpg",
"r": 1
},
"howitzer": {
"f": "img/cards/howitzer.jpg",
"r": 1
},
"poilu": {
"f": "img/cards/poilu.jpg",
"t": "French soldiers of the 87th Regiment shelter in their trenches at Hill",
"a": "French photographer",
"l": "Public domain",
"p": "https://commons.wikimedia.org/wiki/File:French_soldiers_of_the_87th_Regiment_shelter_in_their_trenches_at_Hill_304_at_Verdun.jpg"
},
"arditi": {
"f": "img/cards/arditi.jpg",
"t": "Italian Arditi",
"a": "An unknown serviceman of the Regio Esercito",
"l": "Public domain",
"p": "https://commons.wikimedia.org/wiki/File:Italian_Arditi.jpg"
},
"storm": {
"f": "img/cards/storm.jpg",
"t": "WWI German stormtroopers pulling field gun",
"a": "Official Imperial War Museum German photographer",
"l": "Public domain",
"p": "https://commons.wikimedia.org/wiki/File:WWI_German_stormtroopers_pulling_field_gun.png"
},
"vickers": {
"f": "img/cards/vickers.jpg",
"t": "Vickers machine gun crew with gas masks",
"a": "John Warwick Brooke",
"l": "Public domain",
"p": "https://commons.wikimedia.org/wiki/File:Vickers_machine_gun_crew_with_gas_masks.jpg"
},
"mg08": {
"f": "img/cards/mg08.jpg",
"t": "Boche machine gun crew captured with their gun (4687954103)",
"a": "National Library of Scotland",
"l": "No restrictions",
"p": "https://commons.wikimedia.org/wiki/File:Boche_machine_gun_crew_captured_with_their_gun_(4687954103).jpg"
},
"lewis": {
"f": "img/cards/lewis.jpg",
"t": "British Lewis gun team Battle of Hazebrouck 1918 IWM Q 10902",
"a": "Aitken T K (2nd Lt)",
"l": "Public domain",
"p": "https://commons.wikimedia.org/wiki/File:British_Lewis_gun_team_Battle_of_Hazebrouck_1918_IWM_Q_10902.jpg"
},
"atrifle": {
"f": "img/cards/atrifle.jpg",
"t": "Mauser Tank-Gewehr M1918",
"a": "Rama",
"l": "CC BY-SA 2.0 fr",
"p": "https://commons.wikimedia.org/wiki/File:Mauser_Tank-Gewehr_M1918.jpg"
},
"flame": {
"f": "img/cards/flame.jpg",
"t": "French soldier with a flamethrower (c. 1916)",
"a": "Unknown authorUnknown author",
"l": "Public domain",
"p": "https://commons.wikimedia.org/wiki/File:French_soldier_with_a_flamethrower_(c._1916).png"
},
"dough": {
"f": "img/cards/dough.jpg",
"t": "American Infantry Chauchat",
"a": "Lt. Adrian C. Duff",
"l": "Public domain",
"p": "https://commons.wikimedia.org/wiki/File:American_Infantry_Chauchat.jpg"
},
"medic": {
"f": "img/cards/medic.jpg",
"t": "World War I; stretcher bearers Wellcome L0009384",
"a": "",
"l": "CC BY 4.0",
"p": "https://commons.wikimedia.org/wiki/File:World_War_I;_stretcher_bearers_Wellcome_L0009384.jpg"
},
"ottoman": {
"f": "img/cards/ottoman.jpg",
"t": "Assault of Ottoman soldiers",
"a": "Unknown authorUnknown author",
"l": "Public domain",
"p": "https://commons.wikimedia.org/wiki/File:Assault_of_Ottoman_soldiers.jpg"
},
"x_para": {
"f": "img/cards/x_para.jpg",
"t": "Handley Page O-400",
"a": "USAF",
"l": "Public domain",
"p": "https://commons.wikimedia.org/wiki/File:Handley_Page_O-400.jpg"
},
"x_barrage": {
"f": "img/cards/x_barrage.jpg",
"t": "Greatest French gun (320mm) at moment of firing during a night bombard",
"a": "us army ; Still Picture Records Section, Special Media Archi",
"l": "Public domain",
"p": "https://commons.wikimedia.org/wiki/File:Greatest_French_gun_(320mm)_at_moment_of_firing_during_a_night_bombardment._The_belch_of_smoke_from_the_explosion_of..._-_NARA_-_533675_a.jpg"
},
"x_bomber": {
"f": "img/cards/x_bomber.jpg",
"t": "Gotha RG im Flug",
"a": "Unknown authorUnknown author",
"l": "Public domain",
"p": "https://commons.wikimedia.org/wiki/File:Gotha_RG_im_Flug.jpg"
},
"x_mine": {
"f": "img/cards/x_mine.jpg",
"t": "Hawthorn Ridge Redoubt mine (1 July 1916) 1",
"a": "Ernest Brooks",
"l": "Public domain",
"p": "https://commons.wikimedia.org/wiki/File:Hawthorn_Ridge_Redoubt_mine_(1_July_1916)_1.jpg"
},
"x_trench": {
"f": "img/cards/x_trench.jpg",
"t": "World War I soldier in trench - DPLA - 877bea19b521ba6c112c5d56de481a8",
"a": "",
"l": "No restrictions",
"p": "https://commons.wikimedia.org/wiki/File:World_War_I_soldier_in_trench_-_DPLA_-_877bea19b521ba6c112c5d56de481a8c.jpg"
},
"x_fort": {
"f": "img/cards/x_fort.jpg",
"t": "Fort Douaumont Ende 1916",
"a": "\"Photographisches Bild- und Film-Amt\"",
"l": "Public domain",
"p": "https://commons.wikimedia.org/wiki/File:Fort_Douaumont_Ende_1916.jpg"
},
"x_gas": {
"f": "img/cards/x_gas.jpg",
"t": "Training New Zealand troops to cope with poisonous gas attacks during ",
"a": "National Library NZ on The Commons",
"l": "No restrictions",
"p": "https://commons.wikimedia.org/wiki/File:Training_New_Zealand_troops_to_cope_with_poisonous_gas_attacks_during_World_War_I_(21676950371).jpg"
},
"x_recon": {
"f": "img/cards/x_recon.jpg",
"t": "RFC aircraft with aerial reconnaissance camera",
"a": "Royal Flying Corps",
"l": "Public domain",
"p": "https://commons.wikimedia.org/wiki/File:RFC_aircraft_with_aerial_reconnaissance_camera.jpg"
},
"x_ace": {
"f": "img/cards/x_ace.jpg",
"t": "1917 Fokker Dr.I replica at Hiller Aviation Museum",
"a": "Elwood P. Dowd",
"l": "CC0",
"p": "https://commons.wikimedia.org/wiki/File:1917_Fokker_Dr.I_replica_at_Hiller_Aviation_Museum.jpg"
},
"x_wire": {
"f": "img/cards/x_wire.jpg",
"t": "No Man's Land; sea of barbed wire in front of Bulgarian lines, Salonik",
"a": "The Library of Virginia",
"l": "Public domain",
"p": "https://commons.wikimedia.org/wiki/File:No_Man%27s_Land;_sea_of_barbed_wire_in_front_of_Bulgarian_lines,_Saloniki_front.jpg"
},
"x_hospital": {
"f": "img/cards/x_hospital.jpg",
"t": "World War I; motorized field hospital Wellcome L0008998",
"a": "",
"l": "CC BY 4.0",
"p": "https://commons.wikimedia.org/wiki/File:World_War_I;_motorized_field_hospital_Wellcome_L0008998.jpg"
},
"fk77": {
"f": "img/cards/fk77.jpg",
"t": "German 77mm field gun at the AWM Aug 2012",
"a": "Nick-D",
"l": "CC BY-SA 3.0",
"p": "https://commons.wikimedia.org/wiki/File:German_77mm_field_gun_at_the_AWM_Aug_2012.JPG"
},
"f75": {
"f": "img/cards/f75.jpg",
"t": "France 75 mm field gun, Model 1897 - National World War I Museum - Kan",
"a": "Daderot",
"l": "Public domain",
"p": "https://commons.wikimedia.org/wiki/File:France_75_mm_field_gun,_Model_1897_-_National_World_War_I_Museum_-_Kansas_City,_MO_-_DSC07528.JPG"
},
"bertha": {
"f": "img/cards/bertha.jpg",
"t": "Dicke Bertha.Big Bertha",
"a": "",
"l": "Public domain",
"p": "https://commons.wikimedia.org/wiki/File:Dicke_Bertha.Big_Bertha.jpg"
}
};
